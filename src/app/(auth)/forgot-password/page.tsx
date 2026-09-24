import type { Metadata } from "next";
import { ForgotForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-navy-950">Reset your password</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
    </>
  );
}
