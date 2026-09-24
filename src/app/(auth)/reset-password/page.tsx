import type { Metadata } from "next";
import { ResetForm } from "../auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-navy-950">Choose a new password</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">You&apos;ll be signed in straight after.</p>
      <ResetForm />
    </>
  );
}
