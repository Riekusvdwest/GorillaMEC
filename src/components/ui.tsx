import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "outlineLight";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
  secondary: "bg-white text-navy-900 border border-[var(--border)] hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dark: "bg-navy-900 text-white hover:bg-navy-800",
  outlineLight: "border border-white/30 bg-white/5 text-white hover:bg-white/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const field =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-navy-900 placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-navy-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "py-2 min-h-[90px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(field, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-medium text-navy-800 mb-1.5", className)} {...props} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "blue" | "navy";
const tones: Record<Tone, string> = {
  neutral: "bg-navy-50 text-navy-700 ring-navy-100",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  blue: "bg-sky-50 text-sky-700 ring-sky-100",
  navy: "bg-navy-900 text-white ring-navy-900",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-[var(--border)] bg-white shadow-[0_1px_2px_rgba(11,27,43,0.04)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {subtitle ? <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-600">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold text-navy-950 truncate">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-white/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-navy-300">{icon}</div> : null}
      <p className="font-medium text-navy-900">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-[var(--muted)]">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "amber" | "green" }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-3xl font-semibold tabular-nums",
          tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-600" : "text-navy-950",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}

export function Dot({ tone }: { tone: "green" | "amber" | "red" | "grey" | "blue" }) {
  const c = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", grey: "bg-navy-200", blue: "bg-sky-500" }[tone];
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", c)} aria-hidden />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-navy-100", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#ff6a13" />
        <path d="M8 8h16M8 16h16M8 24h16M8 8v16M16 8v16M24 8v16" stroke="#0b1b2b" strokeOpacity=".18" strokeWidth="1" />
        <path d="M22.5 11.5A8 8 0 1 0 24 17h-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={cn("font-display text-lg font-semibold tracking-tight", dark ? "text-white" : "text-navy-950")}>
        Gorilla<span className="text-brand-500">PM</span>
      </span>
    </span>
  );
}
