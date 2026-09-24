"use server";

import { createClient } from "@/lib/supabase/server";

export type IntakeState = { ok?: string; error?: string } | null;

export async function submitIntake(_prev: IntakeState, fd: FormData): Promise<IntakeState> {
  if (fd.get("website")) return { ok: "BL-000" }; // honeypot
  const slug = String(fd.get("slug") ?? "");
  const payload: Record<string, string> = {};
  for (const k of ["title", "description", "justification", "requestor_name", "requestor_email", "requestor_role", "source", "site", "business_impact", "target_quarter", "downtime_required", "dependencies", "suggested_solution"]) {
    const v = fd.get(k);
    if (typeof v === "string" && v.trim()) payload[k] = v.trim();
  }
  if (!payload.title) return { error: "Please give your request a title." };
  if (!payload.requestor_name) return { error: "Please tell us your name." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_intake", { p_slug: slug, p_payload: payload });
  if (error) return { error: error.message };
  return { ok: data as string };
}
