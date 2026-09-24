import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/workspace";
import { ButtonLink, Logo } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";
import { acceptInvite } from "./actions";

export const metadata: Metadata = { title: "Join a workspace" };

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { error: actionError } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-navy-950">You&apos;ve been invited to GorillaPM</h1>
        <p className="mt-2 text-[var(--muted)]">Create an account or log in with the email address the invitation was sent to. You&apos;ll come straight back here.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href={`/signup?next=/invite/${token}`}>Create account</ButtonLink>
          <ButtonLink href={`/login?next=/invite/${token}`} variant="secondary">Log in</ButtonLink>
        </div>
      </Shell>
    );
  }
  const { data } = await supabase.rpc("invitation_info", { p_token: token });
  const info = (data as { organization_name: string; email: string; role: string; valid: boolean }[] | null)?.[0];
  if (!info || !info.valid) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-navy-950">This invitation can&apos;t be used</h1>
        <p className="mt-2 text-[var(--muted)]">It has expired, was already used, or was revoked. Ask the person who invited you for a new link.</p>
        <div className="mt-6"><ButtonLink href="/app">Go to my workspace</ButtonLink></div>
      </Shell>
    );
  }
  const wrongEmail = info.email.toLowerCase() !== (user.email ?? "").toLowerCase();
  return (
    <Shell>
      <h1 className="text-2xl font-semibold text-navy-950">Join {info.organization_name}</h1>
      <p className="mt-2 text-[var(--muted)]">You&apos;ve been invited as <strong className="text-navy-900">{info.role}</strong>.</p>
      {wrongEmail ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This invitation is for {info.email}, but you&apos;re signed in as {user.email}. Log out and sign in with the invited address.
        </p>
      ) : (
        <form action={acceptInvite} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton size="lg" className="w-full" pendingText="Joining…">Join workspace</SubmitButton>
        </form>
      )}
      {typeof actionError === "string" ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4 text-center">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}
