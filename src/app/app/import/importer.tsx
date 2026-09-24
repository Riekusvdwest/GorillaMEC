"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { parseImportFile, runImport, type ImportResult, type ParsedSheet } from "./actions";
import { FIELDS, TARGETS, autoMap, scoreFields, type ImportTarget } from "@/lib/import-map";
import { Button, Card, CardHeader, Field, Input, Select, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Importer({ features, criteria, projectLabel }: { features: string[]; criteria: { key: string; label: string }[]; projectLabel: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [target, setTarget] = useState<ImportTarget>("tasks");
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const allowed = (t: ImportTarget) => (t === "backlog" ? features.includes("portfolio") : t === "people" ? features.includes("resources") : true);
  const fields = useMemo(() => [...FIELDS[target], ...(target === "backlog" ? scoreFields(criteria) : [])], [target, criteria]);

  function parse(f: File, sheet?: string, headerRow?: number) {
    setError(null);
    setResult(null);
    start(async () => {
      const fd = new FormData();
      fd.set("file", f);
      if (sheet) fd.set("sheet", sheet);
      if (headerRow) fd.set("header_row", String(headerRow));
      const res = await parseImportFile(fd);
      if (res.error) {
        setError(res.error);
        setParsed(null);
        return;
      }
      setParsed(res);
      const guess = guessTarget(res.headers);
      const t = allowed(guess) ? guess : "tasks";
      setTarget(t);
      setMapping(autoMap(t, res.headers, t === "backlog" ? scoreFields(criteria) : []));
    });
  }

  function guessTarget(headers: string[]): ImportTarget {
    const h = headers.join(" ").toLowerCase();
    if (/backlog id|intake|justification|requestor/.test(h)) return "backlog";
    if (/hrs cap|role \/ function|allocation window/.test(h)) return "people";
    if (/initial budget|cost category|new budget|decision/.test(h) && !/task name/.test(h)) return "projects";
    return "tasks";
  }

  function changeTarget(t: ImportTarget) {
    setTarget(t);
    if (parsed) setMapping(autoMap(t, parsed.headers, t === "backlog" ? scoreFields(criteria) : []));
  }

  function doImport() {
    if (!parsed) return;
    setError(null);
    start(async () => {
      const res = await runImport(target, mapping, parsed.rows);
      if (res.error) setError(res.error);
      setResult(res);
    });
  }

  const titleKey = target === "projects" || target === "people" ? "name" : "title";
  const preview = parsed?.rows.slice(0, 5) ?? [];

  if (result && !result.error) {
    return (
      <Card className="p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-semibold text-navy-950">Imported {result.created} {TARGETS.find((t) => t.key === target)?.label.toLowerCase()}</h2>
        {result.skipped ? <p className="mt-1 text-sm text-[var(--muted)]">{result.skipped} empty rows skipped.</p> : null}
        {result.extra ? <p className="mt-1 text-sm text-[var(--muted)]">{result.extra}</p> : null}
        <div className="mt-6 flex justify-center gap-3">
          <Link href={target === "tasks" ? "/app/my-work" : target === "backlog" ? "/app/portfolio" : target === "people" ? "/app/capacity" : "/app/projects"} className={buttonClass("primary")}>
            See them
          </Link>
          <Button variant="secondary" onClick={() => { setResult(null); setParsed(null); setFile(null); }}>Import another file</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="1. Choose a file" subtitle="Excel (.xlsx, .xlsm), CSV, or an MS Planner export. Nothing is saved until you press Import." />
        <div className="p-5">
          <label className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors", file ? "border-brand-300 bg-brand-50/40" : "border-navy-200 hover:border-navy-400")}>
            {pending && !parsed ? <Loader2 className="h-8 w-8 animate-spin text-brand-500" /> : file ? <FileSpreadsheet className="h-8 w-8 text-brand-500" /> : <Upload className="h-8 w-8 text-navy-300" />}
            <span className="mt-3 font-medium text-navy-900">{file ? file.name : "Click to choose a file"}</span>
            <span className="text-xs text-[var(--muted)]">Up to 9 MB and 5,000 rows</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  parse(f);
                }
              }}
            />
          </label>
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        </div>
      </Card>

      {parsed && file ? (
        <>
          <Card>
            <CardHeader title="2. What's in it?" subtitle={`${parsed.total} rows found under the header on row ${parsed.headerRow}.`} />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {parsed.sheets.length > 1 ? (
                <Field label="Sheet">
                  <Select value={parsed.sheet} onChange={(e) => parse(file, e.target.value)}>
                    {parsed.sheets.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
              ) : null}
              <Field label="Header row" hint="Change if the column names look wrong.">
                <Input type="number" min={1} defaultValue={parsed.headerRow} onBlur={(e) => Number(e.target.value) !== parsed.headerRow && parse(file, parsed.sheet, Number(e.target.value))} />
              </Field>
              <Field label="Import as">
                <Select value={target} onChange={(e) => changeTarget(e.target.value as ImportTarget)}>
                  {TARGETS.map((t) => (
                    <option key={t.key} value={t.key} disabled={!allowed(t.key)}>
                      {t.key === "projects" ? `${projectLabel}s` : t.label}
                      {!allowed(t.key) ? " (Premium)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="3. Match columns to fields" subtitle="We guessed from the column names. Leave a field on “Don't import” to skip it." />
            <div className="divide-y divide-[var(--border)]">
              {fields.map((f) => {
                const idx = mapping[f.key];
                const samples = idx !== null && idx !== undefined ? preview.map((r) => r[idx]).filter(Boolean).slice(0, 3) : [];
                return (
                  <div key={f.key} className="grid items-center gap-3 px-5 py-2.5 md:grid-cols-[220px_260px_1fr]">
                    <span className="text-sm font-medium text-navy-900">
                      {f.label} {f.required ? <span className="text-brand-600">*</span> : null}
                    </span>
                    <Select className="h-9" value={idx ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === "" ? null : Number(e.target.value) }))}>
                      <option value="">Don&apos;t import</option>
                      {parsed.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </Select>
                    <span className="truncate text-xs text-[var(--muted)]">{samples.length ? samples.join(" · ") : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-5">
              <p className="text-sm text-[var(--muted)]">
                {mapping[titleKey] === null || mapping[titleKey] === undefined
                  ? `Pick the column for “${fields.find((f) => f.key === titleKey)?.label}” to continue.`
                  : `${parsed.rows.filter((r) => r[mapping[titleKey]!]).length} rows will be imported.`}
              </p>
              <Button onClick={doImport} disabled={pending || mapping[titleKey] === null || mapping[titleKey] === undefined}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Import
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
