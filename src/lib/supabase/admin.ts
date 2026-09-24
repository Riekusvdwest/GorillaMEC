import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client. Bypasses row-level security, so only use it for trusted
 * server-side jobs (Stripe webhooks, marketing leads). Never import it into
 * anything that runs in the browser.
 */
export function createAdminClient() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
