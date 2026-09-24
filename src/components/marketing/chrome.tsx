import Link from "next/link";
import { Menu } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/consulting", label: "Consulting" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="GorillaPM home">
          <Logo dark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-navy-100 hover:bg-white/5 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="rounded-md px-3 py-2 text-sm text-navy-100 hover:text-white">
            Log in
          </Link>
          <ButtonLink href="/signup" size="sm">
            Start free trial
          </ButtonLink>
        </div>
        <details className="relative md:hidden">
          <summary className="list-none rounded-md p-2 text-white hover:bg-white/10 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-navy-900 p-2 shadow-2xl">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2.5 text-sm text-navy-100 hover:bg-white/5">
                {n.label}
              </Link>
            ))}
            <div className="my-2 border-t border-white/10" />
            <Link href="/login" className="block rounded-md px-3 py-2.5 text-sm text-navy-100 hover:bg-white/5">
              Log in
            </Link>
            <ButtonLink href="/signup" className="mt-1 w-full">
              Start free trial
            </ButtonLink>
          </div>
        </details>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="blueprint border-t border-white/10 text-navy-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">
            Project and portfolio management that shapes itself to how your team works. Built by GorillaMEC, mechanical and electrical engineers in the Netherlands.
          </p>
        </div>
        <FooterCol title="Product" links={[["/features", "Features"], ["/solutions", "Solutions"], ["/pricing", "Pricing"], ["/signup", "Start free trial"]]} />
        <FooterCol title="Company" links={[["/about", "About"], ["/consulting", "MEP consulting"], ["/contact", "Contact / book a demo"]]} />
        <div>
          <h3 className="text-sm font-semibold text-white">Get in touch</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="mailto:info@gorillamec.com" className="hover:text-white">info@gorillamec.com</a>
            </li>
            <li>
              <a href="tel:+31657191317" className="hover:text-white">+31 6 57 19 13 17</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} GorillaMEC. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, body, center, dark }: { eyebrow?: string; title: string; body?: string; center?: boolean; dark?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">{eyebrow}</p> : null}
      <h2 className={`mt-2 text-3xl font-semibold sm:text-4xl ${dark ? "text-white" : "text-navy-950"}`}>{title}</h2>
      {body ? <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-navy-200" : "text-[var(--muted)]"}`}>{body}</p> : null}
    </div>
  );
}
