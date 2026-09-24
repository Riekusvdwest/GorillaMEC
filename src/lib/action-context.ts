import "server-only";
import { getWorkspace, type Workspace } from "@/lib/workspace";

export class ActionError extends Error {}

/** Workspace for a mutating server action; refuses read-only members and expired trials. */
export async function writeContext(feature?: string): Promise<Workspace> {
  const ws = await getWorkspace({ allowIncomplete: true });
  if (!ws.active) throw new ActionError("Your trial has ended. Choose a plan in Billing to keep editing.");
  if (!ws.canWrite) throw new ActionError("You have read-only access to this workspace.");
  if (feature && !ws.features.has(feature)) throw new ActionError("This feature isn't included in your plan. Upgrade in Billing.");
  return ws;
}

export async function adminContext(): Promise<Workspace> {
  const ws = await getWorkspace({ allowIncomplete: true });
  if (!ws.isAdmin) throw new ActionError("Only owners and admins can do this.");
  return ws;
}

/** Throws on a Supabase error; otherwise returns the data (typed non-null for selects). */
export function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new ActionError(res.error.message);
  return res.data as NonNullable<T>;
}
