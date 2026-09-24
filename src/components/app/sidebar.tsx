"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  FolderKanban,
  Inbox,
  Gauge,
  CalendarClock,
  FileSpreadsheet,
  Settings,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui";

const ICONS = { home: Home, work: ListChecks, projects: FolderKanban, portfolio: Inbox, capacity: Gauge, meetings: CalendarClock, import: FileSpreadsheet, settings: Settings, billing: CreditCard };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: string };

export function Sidebar({ items, footer, orgSwitcher }: { items: NavItem[]; footer: React.ReactNode; orgSwitcher: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex-1 space-y-0.5 px-3" aria-label="App">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-white/10 font-medium text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-brand-400" : "text-navy-400")} aria-hidden />
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-navy-950">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
  const body = (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-5">
        <Link href="/app" aria-label="GorillaPM home">
          <Logo dark />
        </Link>
      </div>
      <div className="px-3">{orgSwitcher}</div>
      {nav}
      <div className="px-3">{footer}</div>
    </div>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-navy-950 px-4 lg:hidden">
        <Logo dark />
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 text-white hover:bg-white/10" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-navy-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-md p-2 text-white hover:bg-white/10" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {body}
          </div>
        </div>
      ) : null}
      <aside className="blueprint fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 lg:block">{body}</aside>
    </>
  );
}
