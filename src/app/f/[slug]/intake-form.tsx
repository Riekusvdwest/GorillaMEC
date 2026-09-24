"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitIntake, type IntakeState } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";

export function IntakeForm({ slug, quarters }: { slug: string; quarters: { key: string; label: string }[] }) {
  const [state, action] = useActionState<IntakeState, FormData>(submitIntake, null);
  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-navy-950">Request received: {state.ok}</h2>
        <p className="mt-2 text-sm text-navy-700">It&apos;s in the backlog and will be triaged at the next governance meeting.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      <input type="hidden" name="slug" value={slug} />
      <div className="hidden" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <Field label="What do you need? (title)"><Input name="title" required maxLength={300} /></Field>
      <Field label="Describe the problem or opportunity"><Textarea name="description" rows={4} /></Field>
      <Field label="Why does it matter? (justification)"><Textarea name="justification" rows={2} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name"><Input name="requestor_name" required autoComplete="name" /></Field>
        <Field label="Your email"><Input name="requestor_email" type="email" autoComplete="email" /></Field>
        <Field label="Your role or team"><Input name="requestor_role" /></Field>
        <Field label="Site or location"><Input name="site" /></Field>
        <Field label="Where does this come from?">
          <Select name="source" defaultValue="internal">
            <option value="internal">Internal request</option>
            <option value="external">External request</option>
            <option value="incident">Incident</option>
            <option value="audit">Audit finding</option>
            <option value="health_dashboard">Health dashboard</option>
          </Select>
        </Field>
        <Field label="Business impact if not done">
          <Select name="business_impact" defaultValue="">
            <option value="">Not sure</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Needed by">
          <Select name="target_quarter" defaultValue="">
            <option value="">No preference</option>
            {quarters.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
          </Select>
        </Field>
        <Field label="Needs downtime or a shutdown?">
          <Select name="downtime_required" defaultValue="">
            <option value="">Not sure</option><option value="true">Yes</option><option value="false">No</option>
          </Select>
        </Field>
      </div>
      <Field label="Dependencies"><Input name="dependencies" /></Field>
      <Field label="Suggested solution (optional)"><Textarea name="suggested_solution" rows={2} /></Field>
      {state?.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <SubmitButton size="lg" className="w-full" pendingText="Sending…">Submit request</SubmitButton>
    </form>
  );
}
