import "server-only";
import type { Workspace } from "@/lib/workspace";
import type { Person } from "@/lib/types";

export interface Member { user_id: string; role: string; name: string; email: string }

export async function getMembers(ws: Workspace): Promise<Member[]> {
  const { data: ms } = await ws.supabase.from("memberships").select("user_id, role").eq("organization_id", ws.org.id);
  const ids = (ms ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await ws.supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  return (ms ?? []).map((m) => {
    const p = (profiles ?? []).find((x) => x.id === m.user_id);
    return { user_id: m.user_id, role: m.role, name: p?.full_name || p?.email || "Member", email: p?.email || "" };
  });
}

export async function getPeople(ws: Workspace): Promise<Person[]> {
  if (!ws.features.has("resources")) return [];
  const { data } = await ws.supabase.from("people").select("*").eq("organization_id", ws.org.id).order("name");
  return (data ?? []) as Person[];
}

export function disciplineLabel(ws: Workspace, key: string | null | undefined) {
  if (!key) return "—";
  return ws.blueprint.disciplines.find((d) => d.key === key)?.label ?? key;
}
