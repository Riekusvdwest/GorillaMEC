// An illustrative, static rendering of the GorillaPM portfolio screen for the
// marketing site. All content is sample data, not customer data.

const rows = [
  { id: "BL-004", title: "UPS battery end-of-life replacement", score: 26.5, pri: "Must", q: "Q3", rag: "green", pct: 35 },
  { id: "BL-009", title: "Fire alarm ↔ power monitoring integration", score: 25.0, pri: "Must", q: "Q2", rag: "amber", pct: 60 },
  { id: "BL-005", title: "Transformer replacement programme", score: 24.5, pri: "Should", q: "Q2", rag: "red", pct: 20 },
  { id: "BL-012", title: "Sprinkler remediation, halls 6–7", score: 24.0, pri: "Should", q: "Q3", rag: "green", pct: 5 },
  { id: "BL-017", title: "Mechanical corridor sealing", score: 22.0, pri: "Should", q: "Q2", rag: "green", pct: 45 },
];

const heat = [
  { name: "Project Manager", v: [72, 88, 104, 61] },
  { name: "Electrical Eng.", v: [55, 96, 118, 80] },
  { name: "Mechanical Eng.", v: [40, 62, 71, 58] },
  { name: "Technicians", v: [80, 91, 97, 84] },
];

function heatColor(v: number) {
  if (v > 100) return "bg-red-500/80 text-white";
  if (v > 85) return "bg-amber-400/80 text-navy-950";
  if (v > 60) return "bg-emerald-500/70 text-white";
  return "bg-emerald-500/30 text-emerald-50";
}

export function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-brand-500/10 blur-3xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl ring-1 ring-white/5" role="img" aria-label="Illustration of the GorillaPM portfolio screen with a ranked backlog and a capacity heatmap">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-xs text-navy-300">app.gorillamec.com/app/portfolio</span>
        </div>
        <div className="grid md:grid-cols-[200px_1fr]">
          <aside className="hidden border-r border-white/10 p-4 text-sm text-navy-300 md:block">
            {["Home", "My work", "Projects", "Portfolio", "Capacity", "Meetings", "Import"].map((l) => (
              <div key={l} className={`mb-1 rounded-md px-2.5 py-1.5 ${l === "Portfolio" ? "bg-white/10 text-white" : ""}`}>
                {l}
              </div>
            ))}
            <div className="mt-6 rounded-lg border border-white/10 p-3 text-xs">
              <p className="text-navy-400">Scoring model</p>
              <p className="mt-1 text-white">Safety 25 · Availability 50 · Compliance 20 · Energy 5</p>
            </div>
          </aside>
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-brand-400">Portfolio · FY27</p>
                <p className="font-display text-lg font-semibold text-white">Ranked backlog</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-md bg-white/5 px-2.5 py-1 text-navy-200">12 new requests</span>
                <span className="rounded-md bg-brand-500 px-2.5 py-1 font-medium text-white">+ Intake form</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-white/5 text-navy-300">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Priority</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Quarter</th>
                    <th className="px-3 py-2 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-navy-100">
                  {rows.map((r, i) => (
                    <tr key={r.id} className={i === 0 ? "bg-brand-500/10" : ""}>
                      <td className="px-3 py-2.5 text-navy-400">{r.id}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${r.rag === "green" ? "bg-emerald-400" : r.rag === "amber" ? "bg-amber-400" : "bg-red-400"}`} />
                          <span className="line-clamp-1">{r.title}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-white">{r.score.toFixed(1)}</td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">{r.pri}</td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">{r.q}</td>
                      <td className="px-3 py-2.5">
                        <div className="h-1.5 w-16 rounded-full bg-white/10 sm:w-24">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${r.pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-white/10 p-3">
                <p className="mb-2 text-xs font-medium text-navy-300">Capacity by discipline (% of quarterly hours)</p>
                <div className="grid grid-cols-[110px_repeat(4,1fr)] gap-1 text-[11px]">
                  <span />
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                    <span key={q} className="text-center text-navy-400">{q}</span>
                  ))}
                  {heat.map((h) => (
                    <div key={h.name} className="contents">
                      <span className="truncate py-1 text-navy-200">{h.name}</span>
                      {h.v.map((v, j) => (
                        <span key={j} className={`rounded py-1 text-center font-medium tabular-nums ${heatColor(v)}`}>{v}%</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 p-3 text-xs text-navy-200">
                <p className="mb-2 font-medium text-navy-300">Next governance meeting · Thu 10:00</p>
                <ul className="space-y-1.5">
                  <li>• 4 new requests to triage</li>
                  <li>• 2 items ready for prioritisation</li>
                  <li>• 1 blocked: BL-005 awaiting long-lead delivery</li>
                  <li>• Electrical engineers over capacity in Q3</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
