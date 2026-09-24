import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="GorillaPM home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          © GorillaMEC · <Link href="/legal/privacy" className="hover:underline">Privacy</Link> · <Link href="/legal/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
      <div className="blueprint relative hidden flex-col justify-center overflow-hidden p-14 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">GorillaPM</p>
        <h2 className="mt-3 max-w-md text-4xl font-semibold leading-tight">Intake → prioritise → allocate → deliver → review.</h2>
        <ul className="mt-8 space-y-3 text-navy-100">
          {[
            "A workspace generated from how your team works",
            "Weighted scoring and capacity before you commit",
            "Waterfall, sprints and Kanban side by side",
            "Import your Excel tracker on day one",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 text-brand-500" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
