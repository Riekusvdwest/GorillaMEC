import Link from "next/link";
import { LogOut, ChevronsUpDown, Plus } from "lucide-react";
import { getWorkspace, trialDaysLeft } from "@/lib/workspace";
import { plural } from "@/lib/blueprint";
import { Sidebar, type NavItem } from "@/components/app/sidebar";
import { RunningTimer } from "@/components/app/timer";
import { switchOrg } from "./actions/org";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ws = await getWorkspace();
  const bp = ws.blueprint;

  const items: NavItem[] = [
    { href: "/app", label: "Home", icon: "home" },
    { href: "/app/my-work", label: "My work", icon: "work" },
    { href: "/app/projects", label: plural(bp.levels.project.label), icon: "projects" },
  ];
  if (bp.modules.portfolio && ws.features.has("portfolio")) items.push({ href: "/app/portfolio", label: "Portfolio", icon: "portfolio" });
  if (bp.modules.resources && ws.features.has("resources")) items.push({ href: "/app/capacity", label: "Capacity", icon: "capacity" });
  if (bp.modules.governance && ws.features.has("meetings")) items.push({ href: "/app/meetings", label: "Meetings", icon: "meetings" });
  items.push({ href: "/app/import", label: "Import", icon: "import" });
  items.push({ href: "/app/settings", label: "Settings", icon: "settings" });
  if (ws.isAdmin) items.push({ href: "/app/billing", label: "Billing", icon: "billing" });

  const { data: running } = await ws.supabase
    .from("time_entries")
    .select("started_at, task:tasks(title), project:projects(name)")
    .eq("organization_id", ws.org.id)
    .eq("user_id", ws.user.id)
    .is("ended_at", null)
    .maybeSingle();
  const runningRow = running as unknown as { started_at: string; task: { title: string } | null; project: { name: string } | null } | null;

  const days = trialDaysLeft(ws.org);

  const orgSwitcher = (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-xs font-semibold text-white">{initials(ws.org.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{ws.org.name}</span>
          <span className="block text-xs capitalize text-navy-300">
            {ws.org.plan} · {ws.role}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-navy-400" />
      </summary>
      <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-white/10 bg-navy-900 p-1 shadow-xl">
        {ws.orgs.map((o) => (
          <form key={o.id} action={switchOrg}>
            <input type="hidden" name="org_id" value={o.id} />
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-navy-100 hover:bg-white/10" disabled={o.id === ws.org.id}>
              {o.name} {o.id === ws.org.id ? "✓" : ""}
            </button>
          </form>
        ))}
        <Link href="/onboarding?new=1" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-300 hover:bg-white/10 hover:text-white">
          <Plus className="h-4 w-4" /> New company
        </Link>
      </div>
    </details>
  );

  const footer = (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-white">{initials(ws.user.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{ws.user.name}</span>
        <span className="block truncate text-xs text-navy-400">{ws.user.email}</span>
      </span>
      <form action="/auth/signout" method="post">
        <button className="rounded-md p-1.5 text-navy-400 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar items={items} footer={footer} orgSwitcher={orgSwitcher} />
      <div className="lg:pl-64">
        {!ws.active ? (
          <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
            {ws.org.plan === "trial" ? "Your trial has ended." : "Your subscription is inactive."} The workspace is read-only.{" "}
            {ws.isAdmin ? <Link href="/app/billing" className="font-semibold underline">Choose a plan</Link> : "Ask an admin to choose a plan."}
          </div>
        ) : days !== null && days <= 14 ? (
          <div className="border-b border-brand-100 bg-brand-50 px-4 py-2 text-center text-sm text-brand-800">
            {days} day{days === 1 ? "" : "s"} left in your Premium trial.{" "}
            {ws.isAdmin ? <Link href="/app/billing" className="font-semibold underline">Choose a plan</Link> : null}
          </div>
        ) : null}
        {runningRow ? (
          <div className="sticky top-14 z-20 flex justify-end px-4 pt-3 lg:top-0 lg:px-8">
            <RunningTimer since={runningRow.started_at} label={runningRow.task?.title ?? runningRow.project?.name ?? "Timer"} />
          </div>
        ) : null}
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
