"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";

export type AuthState = { error?: string; message?: string } | null;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

const notConfigured = { error: "Sign-in isn't connected yet. Please try again shortly." };

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return notConfigured;
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Please confirm your email first. Check your inbox for the link." };
    return { error: "That email and password don't match." };
  }
  redirect(safeNext(fd.get("next")));
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters for your password").max(200),
});

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return notConfigured;
  const parsed = signUpSchema.safeParse({ full_name: fd.get("full_name"), email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!fd.get("terms")) return { error: "Please accept the terms to continue." };
  const plan = String(fd.get("plan") ?? "");
  const nextRaw = String(fd.get("next") ?? "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/onboarding";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, intended_plan: ["basic", "premium", "gold"].includes(plan) ? plan : null },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(next);
  return { message: `We've sent a confirmation link to ${parsed.data.email}. Click it to finish setting up your workspace.` };
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return notConfigured;
  const email = String(fd.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
