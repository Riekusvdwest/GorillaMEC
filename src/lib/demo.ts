import "server-only";
import { randomUUID } from "node:crypto";
import type { Blueprint } from "@/lib/blueprint";
import { fiscalQuarterOf, upcomingQuarters } from "@/lib/fiscal";
import { toISODate } from "@/lib/utils";

// Sample data so a new workspace isn't empty. Everything is flagged is_demo and
// can be removed in one click from Settings. Names are generic on purpose.

type Row = Record<string, unknown>;
export interface DemoData {
  people: Row[];
  programs: Row[];
  projects: Row[];
  phases: Row[];
  tasks: Row[];
  backlog: Row[];
  allocations: Row[];
  updates: Row[];
  raid: Row[];
}

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISODate(d);
};

export function buildDemo(org: string, bp: Blueprint, ownerId: string, ownerName: string): DemoData {
  const out: DemoData = { people: [], programs: [], projects: [], phases: [], tasks: [], backlog: [], allocations: [], updates: [], raid: [] };
  const fy = bp.company.fiscalYearStartMonth;
  const quarters = upcomingQuarters(new Date(), fy, 2);
  const nowQ = fiscalQuarterOf(new Date(), fy);
  const qIdx = Math.max(0, quarters.findIndex((q) => q.key === nowQ.key));
  const q = (i: number) => quarters[Math.min(quarters.length - 1, qIdx + i)]!.key;
  const disc = (i: number) => bp.disciplines[i % Math.max(1, bp.disciplines.length)]?.key ?? "member";

  // People -------------------------------------------------------------------
  const people = bp.disciplines.slice(0, 6).map((d, i) => ({
    id: randomUUID(),
    organization_id: org,
    name: i === 0 ? ownerName : `${d.label} ${i === 3 ? "pool" : "(sample)"}`,
    user_id: i === 0 ? ownerId : null,
    discipline: d.key,
    role_title: d.label,
    employment_type: d.key.startsWith("ctr") ? "contractor" : d.key === "tech" ? "pool" : "fte",
    capacity_hours_per_quarter: bp.capacityPerQuarter,
    is_demo: i !== 0,
  }));
  out.people = people;
  const pid = (i: number) => people[i % people.length]?.id ?? null;

  // Program -----------------------------------------------------------------
  const programId = randomUUID();
  if (bp.levels.program.enabled) {
    out.programs.push({ id: programId, organization_id: org, name: bp.preset === "critical_facilities" ? "Site reliability programme" : "Sample programme", is_demo: true });
  }

  const engineering = bp.preset === "critical_facilities" || bp.preset === "construction";
  const projects = engineering
    ? [
        { name: "UPS battery end-of-life replacement (Site A)", category: bp.categories[1] ?? "End of life", site: "Site A", health: "on_track", start: -40, end: 80, budget: 840000, forecast: 840000 },
        { name: "Transformer replacement programme (Sites A and B)", category: bp.categories[1] ?? "End of life", site: "Sites A and B", health: "at_risk", start: -20, end: 240, budget: 2000000, forecast: 2150000 },
        { name: "Fire alarm to power-monitoring integration", category: bp.categories[0] ?? "Reliability", site: "Site B", health: "behind", start: -90, end: 30, budget: 372000, forecast: 390000 },
      ]
    : [
        { name: bp.preset === "software" ? "Customer portal v2" : "Website relaunch", category: null, site: null, health: "on_track", start: -14, end: 60, budget: null, forecast: null },
        { name: bp.preset === "software" ? "Billing integration" : "Quarterly campaign", category: null, site: null, health: "at_risk", start: -7, end: 45, budget: null, forecast: null },
      ];

  const phaseNames = bp.levels.phase.enabled && bp.phaseTemplate.length ? bp.phaseTemplate : [];
  const engTasks: [string, string, number][][] = [
    [["Define scope", "ee", 20], ["Develop project schedule", "pm", 4], ["Develop risk plan", "pm", 4], ["Organise project resources", "pm", 8]],
    [["Write scope of work (SOW)", "ctr_pm", 8], ["Shortlist suppliers and request quotes", "ctr_pm", 8], ["Contract and purchase order", "ctr_pm", 8]],
    [["Permits and change approval", "pm", 6], ["Works execution", "ctr_eng", 120], ["Commissioning and testing", "ee", 24], ["Update drawings and asset tags", "ee", 16]],
    [["Close out project records", "pm", 8], ["Confirm all POs are paid", "ctr_pm", 4], ["Handover and sign-off", "pm", 8]],
  ];
  const genericTasks: [string, string, number][] = [
    ["Kick-off and scope", disc(0), 4], ["Plan the work", disc(0), 6], ["Build first version", disc(0), 24], ["Review with stakeholders", disc(1), 4], ["Fix feedback", disc(0), 12], ["Launch", disc(0), 4],
  ];

  projects.forEach((p, pi) => {
    const projectId = randomUUID();
    out.projects.push({
      id: projectId,
      organization_id: org,
      program_id: bp.levels.program.enabled ? programId : null,
      code: engineering ? `P-${String(pi + 1).padStart(2, "0")}` : null,
      name: p.name,
      description: "Sample project created by the setup wizard. Delete it from Settings → Sample data when you're ready.",
      methodology: bp.methodology,
      status: "active",
      health: p.health,
      category: p.category,
      site: p.site,
      decision: engineering ? "keep" : null,
      start_date: day(p.start),
      end_date: day(p.end),
      budget_original: p.budget,
      budget_current: p.forecast,
      committed_quarter: q(pi % 2),
      lead_person_id: pid(0),
      is_demo: true,
    });
    const phaseIds = phaseNames.map((name, i) => {
      const id = randomUUID();
      out.phases.push({ id, organization_id: org, project_id: projectId, name, position: i });
      return id;
    });
    const span = p.end - p.start;
    let position = 0;
    const addTask = (title: string, discipline: string, hours: number, phaseIdx: number, slot: number, slots: number) => {
      const start = p.start + Math.round((span * slot) / slots);
      const finish = Math.min(p.end, start + Math.max(3, Math.round(span / slots)));
      const doneBy = start + 3 < 0;
      const status = finish < 0 ? "completed" : doneBy ? "in_progress" : slot === slots - 1 ? "not_started" : "planned";
      const bucket = status === "in_progress" ? "urgent_important" : status === "planned" ? "important_not_urgent" : null;
      out.tasks.push({
        id: randomUUID(),
        organization_id: org,
        project_id: projectId,
        phase_id: phaseIds[phaseIdx] ?? null,
        title,
        status: bp.statuses.find((s) => s.key === status)?.enabled ? status : status === "planned" ? "not_started" : status,
        priority: status === "in_progress" ? "high" : "medium",
        bucket,
        assignee_id: status !== "completed" && position % 2 === 0 ? ownerId : null,
        resource_type: bp.disciplines.some((d) => d.key === discipline) ? discipline : null,
        estimate_hours: hours,
        start_date: day(start),
        due_date: day(finish),
        percent_complete: status === "completed" ? 100 : status === "in_progress" ? 40 : 0,
        position: position++,
        is_demo: true,
      });
    };
    if (engineering) {
      const all = engTasks.flatMap((group, gi) => group.map((t) => ({ t, gi })));
      all.forEach(({ t, gi }, i) => addTask(t[0], t[1], t[2], gi, i, all.length));
    } else {
      genericTasks.forEach((t, i) => addTask(t[0], t[1], t[2], 0, i, genericTasks.length));
    }
    out.updates.push({
      organization_id: org,
      project_id: projectId,
      body: pi === 1 ? "Long-lead equipment delivery slipped three weeks; supplier asked to expedite." : "Scope confirmed with operations; SOW in review.",
      author_id: ownerId,
    });
  });

  // Backlog --------------------------------------------------------------------
  if (bp.modules.portfolio) {
    const crit = bp.scoring.criteria;
    const mk = (vals: number[]) => Object.fromEntries(crit.map((c, i) => [c.key, Math.min(bp.scoring.scale, vals[i % vals.length] ?? 1)]));
    const items = engineering
      ? [
          { title: "Sprinkler remediation in halls 6 and 7", status: "in_sprint", s: [3, 3, 3, 1], pr: 1, qi: 1, rag: "medium", impact: "high", src: "internal" },
          { title: "Facility drawings rectification", status: "in_sprint", s: [1, 3, 3, 1], pr: 2, qi: 1, rag: "none", impact: "high", src: "internal" },
          { title: "Install early smoke detection in data halls", status: "ready", s: [3, 2, 3, 1], pr: null, qi: 1, rag: "none", impact: "high", src: "audit" },
          { title: "Mechanical corridor sealing", status: "in_progress", s: [1, 3, 2, 1], pr: 2, qi: 0, rag: "none", impact: "medium", src: "internal" },
          { title: "Water ingress at substation", status: "new", s: [], pr: null, qi: 2, rag: "none", impact: "high", src: "incident" },
          { title: "Solar panels on office roof", status: "deferred", s: [1, 1, 1, 3], pr: 4, qi: 3, rag: "none", impact: "low", src: "internal" },
          { title: "Bird strikes at substations", status: "triaged", s: [2, 2, 1, 1], pr: null, qi: 2, rag: "none", impact: "medium", src: "external" },
        ]
      : [
          { title: "Single sign-on for customers", status: "ready", s: [4, 3, 3], pr: null, qi: 1, rag: "none", impact: "high", src: "external" },
          { title: "Dark mode", status: "new", s: [], pr: null, qi: 2, rag: "none", impact: "low", src: "internal" },
          { title: "Faster search", status: "in_sprint", s: [3, 4, 2], pr: 1, qi: 0, rag: "medium", impact: "high", src: "internal" },
        ];
    items.forEach((it) => {
      const id = randomUUID();
      out.backlog.push({
        id,
        organization_id: org,
        title: it.title,
        status: it.status,
        source: it.src,
        business_impact: it.impact,
        scores: it.s.length ? mk(it.s) : {},
        ready_for_prioritization: it.status !== "new",
        committed_priority: it.pr,
        committed_quarter: it.pr && it.pr < 4 ? q(it.qi) : null,
        target_quarter: q(it.qi),
        rag: it.rag,
        requestor_name: "Sample requestor",
        percent_complete: it.status === "in_progress" ? 45 : it.status === "in_sprint" ? 5 : 0,
        planned_start: it.pr && it.pr < 4 ? day(15 + it.qi * 60) : null,
        planned_end: it.pr && it.pr < 4 ? day(75 + it.qi * 60) : null,
        is_demo: true,
      });
      if (it.pr && it.pr < 4 && bp.modules.resources) {
        [0, 1, 3].forEach((di, k) => {
          const d = bp.disciplines[di];
          if (!d) return;
          out.allocations.push({
            organization_id: org,
            backlog_item_id: id,
            person_id: pid(di),
            discipline: d.key,
            quarter: q(it.qi),
            hours: [60, 160, 320][k]! * (it.pr === 1 ? 1.5 : 1),
            is_demo: true,
          });
        });
      }
      if (it.status === "in_sprint" || it.status === "in_progress") {
        out.updates.push({ organization_id: org, backlog_item_id: id, body: "Quotes requested from two suppliers; decision expected next week.", author_id: ownerId });
      }
    });
  }

  if (engineering) {
    const p0 = out.projects[1]?.id;
    out.raid.push(
      { organization_id: org, project_id: p0, kind: "risk", title: "Long-lead transformer delivery slips past the shutdown window", probability: 3, impact: 5, owner: ownerName, status: "open" },
      { organization_id: org, project_id: p0, kind: "decision", title: "Replace both units in one outage rather than two", owner: ownerName, status: "closed" },
      { organization_id: org, project_id: out.projects[2]?.id, kind: "issue", title: "Contractor escort availability limited to two days per week", probability: 4, impact: 3, owner: ownerName, status: "in_progress" },
    );
  }
  return out;
}
