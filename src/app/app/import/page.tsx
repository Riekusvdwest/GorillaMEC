import type { Metadata } from "next";
import { getWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage({ searchParams }: PageProps<"/app/import">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  return (
    <>
      <PageHeader
        title="Import"
        subtitle={sp.welcome ? "Bring your existing tracker in. You can import several files, one after another." : "Excel, CSV and MS Planner exports into tasks, requests, projects or people."}
      />
      {!ws.canWrite ? (
        <p className="text-sm text-[var(--muted)]">You have read-only access.</p>
      ) : (
        <Importer features={[...ws.features]} criteria={ws.blueprint.scoring.criteria} projectLabel={ws.blueprint.levels.project.label} />
      )}
    </>
  );
}
