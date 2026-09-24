"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ORG_COOKIE, getWorkspace } from "@/lib/workspace";
import { adminContext, check } from "@/lib/action-context";
import { str } from "@/lib/utils";

export async function switchOrg(fd: FormData) {
  const id = str(fd, "org_id");
  const ws = await getWorkspace({ allowIncomplete: true });
  if (!id || !ws.orgs.some((o) => o.id === id)) return;
  (await cookies()).set(ORG_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function renameOrg(fd: FormData) {
  const ws = await adminContext();
  const name = str(fd, "name");
  if (!name) return;
  check(await ws.supabase.from("organizations").update({ name }).eq("id", ws.org.id));
  revalidatePath("/app", "layout");
}

export async function createInvitation(fd: FormData) {
  const ws = await adminContext();
  const email = str(fd, "email")?.toLowerCase();
  const role = str(fd, "role") ?? "member";
  if (!email || !/\S+@\S+\.\S+/.test(email)) return;
  check(await ws.supabase.from("invitations").insert({ organization_id: ws.org.id, email, role, invited_by: ws.user.id }));
  revalidatePath("/app/settings");
}

export async function revokeInvitation(fd: FormData) {
  const ws = await adminContext();
  check(await ws.supabase.from("invitations").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  revalidatePath("/app/settings");
}

export async function updateMemberRole(fd: FormData) {
  const ws = await adminContext();
  const role = str(fd, "role");
  if (!role || !["admin", "manager", "member", "guest"].includes(role)) return;
  check(await ws.supabase.from("memberships").update({ role }).eq("organization_id", ws.org.id).eq("user_id", str(fd, "user_id")!));
  revalidatePath("/app/settings");
}

export async function removeMember(fd: FormData) {
  const ws = await adminContext();
  check(await ws.supabase.from("memberships").delete().eq("organization_id", ws.org.id).eq("user_id", str(fd, "user_id")!));
  revalidatePath("/app/settings");
}

export async function deleteSampleData() {
  const ws = await adminContext();
  const db = ws.supabase;
  const org = ws.org.id;
  // Children cascade from projects and backlog items.
  for (const table of ["projects", "backlog_items", "allocations", "meetings", "programs", "people"]) {
    check(await db.from(table).delete().eq("organization_id", org).eq("is_demo", true));
  }
  revalidatePath("/app", "layout");
}
