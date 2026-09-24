import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeBlueprint, type Blueprint } from "@/lib/blueprint";
import type { Organization, Role } from "@/lib/types";

export const ORG_COOKIE = "gpm_org";

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
});

export async function requireUser() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export interface Workspace {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string; name: string };
  org: Organization;
  role: Role;
  orgs: { id: string; name: string; role: Role }[];
  blueprint: Blueprint;
  blueprintComplete: boolean;
  features: Set<string>;
  canWrite: boolean;
  isAdmin: boolean;
  active: boolean;
}

/**
 * Loads the signed-in user's current company, role, blueprint and plan
 * features. Redirects to sign-in or onboarding when needed.
 */
export const getWorkspace = cache(async (opts?: { allowIncomplete?: boolean }): Promise<Workspace> => {
  const { supabase, user } = await requireUser();

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw new Error(error.message);

  const rows = (memberships ?? []) as unknown as { role: Role; organization: Organization }[];
  if (!rows.length) redirect("/onboarding");

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ORG_COOKIE)?.value;
  const current = rows.find((r) => r.organization.id === wanted) ?? rows[0]!;
  const org = current.organization;

  const [{ data: bp }, { data: ent }, { data: profile }] = await Promise.all([
    supabase.from("blueprints").select("config, completed_at").eq("organization_id", org.id).maybeSingle(),
    supabase.from("plan_entitlements").select("features").eq("plan", org.plan).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const blueprintComplete = Boolean(bp?.completed_at);
  if (!blueprintComplete && !opts?.allowIncomplete && (current.role === "owner" || current.role === "admin")) {
    redirect("/onboarding");
  }

  const active =
    org.plan === "trial"
      ? Boolean(org.trial_ends_at && new Date(org.trial_ends_at) > new Date())
      : ["active", "trialing", "past_due"].includes(org.subscription_status);

  return {
    supabase,
    user: { id: user.id, email: user.email ?? "", name: profile?.full_name || user.email || "You" },
    org,
    role: current.role,
    orgs: rows.map((r) => ({ id: r.organization.id, name: r.organization.name, role: r.role })),
    blueprint: normalizeBlueprint(bp?.config),
    blueprintComplete,
    features: new Set<string>(ent?.features ?? []),
    canWrite: current.role !== "guest" && active,
    isAdmin: current.role === "owner" || current.role === "admin",
    active,
  };
});

export function trialDaysLeft(org: Organization) {
  if (org.plan !== "trial" || !org.trial_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86_400_000));
}
