"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE } from "@/lib/workspace";
import { presetBlueprint, type Blueprint } from "@/lib/blueprint";
import { occurrences } from "@/lib/meetings";
import { buildDemo } from "@/lib/demo";

export interface WizardExtras {
  people: { name: string; discipline: string; employment_type: "fte" | "contractor" | "backfill" | "pool"; capacity: number }[];
  invites: { email: string; role: "admin" | "manager" | "member" | "guest" }[];
  sampleData: boolean;
  goToImport: boolean;
}

async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/onboarding");
  return { supabase, user: data.user };
}

export async function createCompany(name: string, preset: string): Promise<{ orgId?: string; config?: Blueprint; error?: string }> {
  const { supabase } = await authed();
  if (!name.trim()) return { error: "Enter your company name." };
  const bp = presetBlueprint(preset, name.trim());
  const { data: orgId, error } = await supabase.rpc("create_organization", { p_name: name.trim(), p_industry: bp.company.industry });
  if (error || !orgId) return { error: error?.message ?? "Could not create the company." };
  const { error: e2 } = await supabase.from("blueprints").update({ config: bp }).eq("organization_id", orgId);
  if (e2) return { error: e2.message };
  (await cookies()).set(ORG_COOKIE, orgId as string, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  return { orgId: orgId as string, config: bp };
}

export async function saveDraft(orgId: string, config: Blueprint): Promise<{ error?: string }> {
  const { supabase } = await authed();
  const { error } = await supabase.from("blueprints").update({ config, updated_at: new Date().toISOString() }).eq("organization_id", orgId);
  return error ? { error: error.message } : {};
}

export async function generateWorkspace(orgId: string, config: Blueprint, extras: WizardExtras): Promise<{ error?: string }> {
  const { supabase, user } = await authed();

  const weights = config.scoring.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  if (config.priorityModel === "weighted" && config.scoring.criteria.length && weights !== 100) {
    return { error: `Scoring weights add up to ${weights}%. Make them add up to 100%.` };
  }

  const { data: org } = await supabase.from("organizations").select("id, name").eq("id", orgId).single();
  if (!org) return { error: "Company not found." };
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const ownerName = profile?.full_name || user.email || "Me";

  if (config.company.name && config.company.name !== org.name) {
    await supabase.from("organizations").update({ name: config.company.name, industry: config.company.industry }).eq("id", orgId);
  }

  const { data: ent } = await supabase.from("organizations").select("plan, plan_entitlements(features)").eq("id", orgId).single();
  const features = new Set<string>(((ent as unknown as { plan_entitlements: { features: string[] } | null })?.plan_entitlements?.features) ?? []);
  const modules = {
    ...config.modules,
    portfolio: config.modules.portfolio && features.has("portfolio"),
    resources: config.modules.resources && features.has("resources"),
    governance: config.modules.governance && features.has("meetings"),
  };
  const finalConfig: Blueprint = { ...config, modules };

  const { error: bpErr } = await supabase
    .from("blueprints")
    .update({ config: finalConfig, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("organization_id", orgId);
  if (bpErr) return { error: bpErr.message };

  // Is this a first run? Only seed things once.
  const [{ count: peopleCount }, { count: formCount }, { count: meetingCount }, { count: projectCount }] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("intake_forms").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  // People (resources). If the owner listed nobody and wants sample data, the
  // sample team is used instead. People imported during setup are kept and not
  // duplicated.
  const listed = extras.people.filter((p) => p.name.trim());
  let realPeople: { id: string; discipline: string | null; user_id: string | null }[] = [];
  if (modules.resources && (listed.length || !extras.sampleData)) {
    const { data: existingPeople } = await supabase.from("people").select("id, name, discipline, user_id").eq("organization_id", orgId);
    const existing = existingPeople ?? [];
    const known = new Set(existing.map((p) => p.name.trim().toLowerCase()));
    const rows: Record<string, unknown>[] = listed
      .filter((p) => !known.has(p.name.trim().toLowerCase()))
      .map((p) => ({
        organization_id: orgId,
        name: p.name.trim(),
        discipline: p.discipline || null,
        role_title: finalConfig.disciplines.find((d) => d.key === p.discipline)?.label ?? null,
        employment_type: p.employment_type,
        capacity_hours_per_quarter: p.capacity || finalConfig.capacityPerQuarter,
      }));
    const ownerListed = listed.some((p) => p.name.trim().toLowerCase() === ownerName.toLowerCase()) || known.has(ownerName.toLowerCase());
    if (!ownerListed && !existing.some((p) => p.user_id === user.id)) {
      rows.unshift({
        organization_id: orgId,
        name: ownerName,
        user_id: user.id,
        discipline: finalConfig.disciplines[0]?.key ?? null,
        role_title: finalConfig.disciplines[0]?.label ?? null,
        employment_type: "fte",
        capacity_hours_per_quarter: finalConfig.capacityPerQuarter,
      });
    }
    if (rows.length) {
      const { data, error } = await supabase.from("people").insert(rows).select("id, discipline, user_id");
      if (error) return { error: `People: ${error.message}` };
      realPeople = data ?? [];
    }
    realPeople = [...realPeople, ...existing.map((p) => ({ id: p.id, discipline: p.discipline, user_id: p.user_id }))];
  }

  // Invitations
  const invites = extras.invites.filter((i) => /\S+@\S+\.\S+/.test(i.email));
  if (invites.length) {
    const { error } = await supabase.from("invitations").insert(invites.map((i) => ({ organization_id: orgId, email: i.email.trim().toLowerCase(), role: i.role, invited_by: user.id })));
    if (error) return { error: `Invitations: ${error.message}` };
  }

  // Intake form
  if (modules.portfolio && !formCount) {
    await supabase.from("intake_forms").insert({ organization_id: orgId, title: `Raise a request with ${config.company.name || org.name}` });
  }

  // Meeting series for the next 12 months
  if (modules.governance && !meetingCount && finalConfig.governance.meetings.length) {
    const rows = finalConfig.governance.meetings.flatMap((s) =>
      occurrences(s, new Date(), 12, finalConfig.company.timezone || "Europe/Amsterdam").map((at) => ({
        organization_id: orgId,
        series: s.name,
        title: s.name,
        meeting_type: s.type,
        starts_at: at.toISOString(),
        duration_minutes: s.durationMinutes,
      })),
    );
    if (rows.length) {
      const { error } = await supabase.from("meetings").insert(rows);
      if (error) return { error: `Meetings: ${error.message}` };
    }
  }

  // Sample data
  if (extras.sampleData && !projectCount) {
    const demo = buildDemo(orgId, finalConfig, user.id, ownerName);
    const useDemoPeople = modules.resources && !peopleCount && realPeople.length === 0;
    if (!useDemoPeople) {
      // Point sample projects and allocations at the real team instead.
      const map = new Map<string, string | null>();
      demo.people.forEach((p, i) => {
        const match = i === 0 ? realPeople.find((r) => r.user_id === user.id) : realPeople.find((r) => r.discipline === p.discipline);
        map.set(p.id as string, match?.id ?? null);
      });
      demo.projects.forEach((p) => (p.lead_person_id = map.get(p.lead_person_id as string) ?? null));
      demo.allocations.forEach((a) => (a.person_id = map.get(a.person_id as string) ?? null));
    }
    const steps: [string, Record<string, unknown>[]][] = [
      ["people", useDemoPeople ? demo.people : []],
      ["programs", demo.programs],
      ["projects", demo.projects],
      ["phases", demo.phases],
      ["tasks", demo.tasks],
      ["backlog_items", modules.portfolio ? demo.backlog : []],
      ["allocations", modules.resources && modules.portfolio ? demo.allocations : []],
      ["item_updates", demo.updates.filter((u) => modules.portfolio || !u.backlog_item_id)],
      ["raid_items", features.has("raid") ? demo.raid : []],
    ];
    for (const [table, rows] of steps) {
      if (!rows.length) continue;
      const { error } = await supabase.from(table).insert(rows);
      if (error) return { error: `Sample data (${table}): ${error.message}` };
    }
  }

  redirect(extras.goToImport ? "/app/import?welcome=1" : "/app?welcome=1");
}
