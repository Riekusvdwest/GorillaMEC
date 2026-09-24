"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.email("Please enter a valid email address").max(320),
  company: z.string().trim().max(200).optional(),
  team_size: z.string().trim().max(50).optional(),
  methodology: z.string().trim().max(50).optional(),
  message: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(50).optional(),
});

export type LeadState = { ok: boolean; error?: string } | null;

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  // Honeypot: bots fill every field.
  if (formData.get("website")) return { ok: true };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "The contact form isn't connected yet. Please email info@gorillamec.com." };
  }
  // Anonymous insert: the leads table only accepts inserts from visitors.
  const supabase = createClient(supabaseUrl()!, supabasePublishableKey()!, { auth: { persistSession: false } });
  const { error } = await supabase.from("leads").insert(parsed.data);
  if (error) return { ok: false, error: "Something went wrong. Please email info@gorillamec.com." };
  return { ok: true };
}
