import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui";
import { upcomingQuarters } from "@/lib/fiscal";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = { title: "Raise a request", robots: { index: false } };

export default async function IntakePage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("intake_form_public", { p_slug: slug });
  const form = (data as { title: string; description: string | null; organization_name: string; fiscal_start: number }[] | null)?.[0];
  if (!form) notFound();
  const quarters = upcomingQuarters(new Date(), form.fiscal_start || 1, 2).map((q) => ({ key: q.key, label: q.label }));
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="blueprint px-4 pb-24 pt-10 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-navy-300">{form.organization_name}</p>
          <h1 className="mt-1 text-3xl font-semibold">{form.title}</h1>
          {form.description ? <p className="mt-3 whitespace-pre-wrap text-navy-200">{form.description}</p> : null}
        </div>
      </div>
      <div className="mx-auto -mt-16 max-w-2xl px-4 pb-16">
        <IntakeForm slug={slug} quarters={quarters} />
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">Powered by <Logo className="scale-75" /></p>
      </div>
    </div>
  );
}
