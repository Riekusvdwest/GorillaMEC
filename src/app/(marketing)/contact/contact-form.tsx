"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitLead, type LeadState } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";

export function ContactForm({ topic }: { topic?: string }) {
  const [state, action] = useActionState<LeadState, FormData>(submitLead, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-navy-950">Thanks, we&apos;ll be in touch.</h2>
        <p className="mt-2 text-sm text-navy-700">We usually reply within one working day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      <input type="hidden" name="source" value={topic === "consulting" ? "consulting" : "contact"} />
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Work email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Company">
          <Input name="company" autoComplete="organization" />
        </Field>
        <Field label="Team size">
          <Select name="team_size" defaultValue="">
            <option value="">Select…</option>
            <option>1–5</option>
            <option>6–30</option>
            <option>31–100</option>
            <option>100+</option>
          </Select>
        </Field>
      </div>
      <Field label="How do you work today?">
        <Select name="methodology" defaultValue={topic === "consulting" ? "consulting" : ""}>
          <option value="">Select…</option>
          <option value="waterfall">Waterfall / phases</option>
          <option value="agile">Agile / sprints</option>
          <option value="kanban">Kanban</option>
          <option value="spreadsheets">Spreadsheets and Planner</option>
          <option value="hybrid">A mix</option>
          <option value="consulting">I need MEP consulting</option>
        </Select>
      </Field>
      <Field label="What would you like to talk about?">
        <Textarea name="message" rows={4} />
      </Field>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Sending…">
        {topic === "consulting" ? "Send enquiry" : "Book a demo"}
      </SubmitButton>
      <p className="text-center text-xs text-[var(--muted)]">We only use your details to reply to you. See our privacy policy.</p>
    </form>
  );
}
