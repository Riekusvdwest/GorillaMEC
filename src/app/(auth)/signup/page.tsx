import type { Metadata } from "next";
import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Start your free trial" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { plan, next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold text-navy-950">Start your 14-day trial</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">Premium features, no card needed. Setup takes a few minutes.</p>
      <SignupForm plan={typeof plan === "string" ? plan : undefined} next={typeof next === "string" ? next : undefined} />
    </>
  );
}
