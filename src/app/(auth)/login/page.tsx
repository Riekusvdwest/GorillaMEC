import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = sp.error === "link" ? "That link has expired or was already used. Log in, or request a new one." : undefined;
  return (
    <>
      <h1 className="text-3xl font-semibold text-navy-950">Welcome back</h1>
      <p className="mt-2 mb-8 text-[var(--muted)]">Log in to your GorillaPM workspace.</p>
      <LoginForm next={next} notice={notice} />
    </>
  );
}
