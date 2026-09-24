import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, ORG_COOKIE } from "@/lib/workspace";
import { normalizeBlueprint } from "@/lib/blueprint";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { rerun, new: fresh } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: rows } = await supabase.from("memberships").select("role, organization:organizations(id, name, plan)").eq("user_id", user.id);
  const memberships = (rows ?? []) as unknown as { role: string; organization: { id: string; name: string; plan: string } }[];
  const orgIds = memberships.map((m) => m.organization.id);
  const { data: bps } = orgIds.length
    ? await supabase.from("blueprints").select("organization_id, config, completed_at").in("organization_id", orgIds)
    : { data: [] as { organization_id: string; config: unknown; completed_at: string | null }[] };
  const bpOf = (id: string) => (bps ?? []).find((b) => b.organization_id === id);

  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const admin = memberships.filter((m) => m.role === "owner" || m.role === "admin");
  let target: (typeof memberships)[number] | undefined;

  if (!fresh) {
    if (rerun) {
      target = admin.find((m) => m.organization.id === wanted) ?? admin[0];
    } else {
      target = admin.find((m) => !bpOf(m.organization.id)?.completed_at);
      if (!target && memberships.length) redirect("/app");
    }
  }

  const plan = target?.organization.plan ?? "trial";
  const [{ data: ent }, { data: profile }] = await Promise.all([
    supabase.from("plan_entitlements").select("features").eq("plan", plan).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <Wizard
      orgId={target?.organization.id ?? null}
      initial={target ? normalizeBlueprint(bpOf(target.organization.id)?.config) : null}
      features={ent?.features ?? []}
      userName={profile?.full_name || user.email || ""}
      rerun={Boolean(rerun)}
    />
  );
}
