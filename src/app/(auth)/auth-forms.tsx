"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signIn, signUp, requestPasswordReset, updatePassword, type AuthState } from "./actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";

function Alert({ state }: { state: AuthState }) {
  if (!state?.error) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100" role="alert">{state.error}</p>;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      {notice ? <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-100">{notice}</p> : null}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" autoFocus />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">Forgot password?</Link>
      </div>
      <Alert state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Log in</SubmitButton>
      <p className="text-center text-sm text-[var(--muted)]">
        New here? <Link href="/signup" className="font-medium text-brand-700 hover:underline">Start a free trial</Link>
      </p>
    </form>
  );
}

export function SignupForm({ plan, next }: { plan?: string; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  if (state?.message) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-navy-950">Check your inbox</h2>
        <p className="mt-2 text-sm text-navy-700">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="plan" value={plan ?? ""} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Full name">
        <Input name="full_name" required autoComplete="name" autoFocus />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" hint="At least 10 characters.">
        <Input name="password" type="password" required minLength={10} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-navy-700">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-brand-500" />
        <span>
          I agree to the <Link href="/legal/terms" className="text-brand-700 hover:underline">terms</Link> and{" "}
          <Link href="/legal/privacy" className="text-brand-700 hover:underline">privacy policy</Link>.
        </span>
      </label>
      <Alert state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating your account…">Create account</SubmitButton>
      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-brand-700 hover:underline">Log in</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  if (state?.message) return <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" autoFocus />
      </Field>
      <Alert state={state} />
      <SubmitButton className="w-full" pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="New password" hint="At least 10 characters.">
        <Input name="password" type="password" required minLength={10} autoComplete="new-password" autoFocus />
      </Field>
      <Alert state={state} />
      <SubmitButton className="w-full" pendingText="Saving…">Save password</SubmitButton>
    </form>
  );
}
