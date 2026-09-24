"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CalendarDays, GripVertical } from "lucide-react";
import { moveTask } from "@/app/app/actions/work";
import { cn, formatShortDate } from "@/lib/utils";

export interface BoardCard {
  id: string;
  title: string;
  status: string;
  bucket: string | null;
  priority: string;
  due_date: string | null;
  project?: string | null;
  assignee?: string | null;
  checklist?: { done: number; total: number };
}

export interface BoardColumn {
  key: string;
  label: string;
  hint?: string;
  tone?: "neutral" | "blue" | "red" | "green" | "amber" | "brand";
}

const toneBar: Record<string, string> = {
  neutral: "bg-navy-300",
  blue: "bg-sky-500",
  red: "bg-red-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  brand: "bg-brand-500",
};

export function DragBoard({
  columns,
  cards: initial,
  field,
  linkBase,
  readOnly,
  grid,
}: {
  columns: BoardColumn[];
  cards: BoardCard[];
  field: "status" | "bucket";
  linkBase: string;
  readOnly?: boolean;
  grid?: boolean;
}) {
  const [cards, setCards] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    // Fresh data from the server (after any change): adopt it.
    setPrevInitial(initial);
    setCards(initial);
  }
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const to = e.over ? String(e.over.id) : null;
    if (!to) return;
    const card = cards.find((c) => c.id === id);
    const value = to === "__none" ? null : to;
    if (!card || (field === "status" ? card.status : card.bucket) === value) return;
    const before = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    start(async () => {
      const res = await moveTask(id, field, value);
      if (res?.error) {
        setCards(before);
        setError(res.error);
      }
    });
  }

  const sep = linkBase.includes("?") ? "&" : "?";
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className={cn(grid ? "grid gap-4 md:grid-cols-2" : "flex gap-4 overflow-x-auto pb-4")}>
        {columns.map((col) => {
          const list = cards.filter((c) => (field === "status" ? c.status : c.bucket ?? "__none") === col.key);
          return (
            <Column key={col.key} col={col} count={list.length} grid={grid}>
              {list.map((c) => (
                <Card key={c.id} card={c} href={`${linkBase}${sep}task=${c.id}`} readOnly={readOnly} />
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}

function Column({ col, count, children, grid }: { col: BoardColumn; count: number; children: React.ReactNode; grid?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border bg-navy-50/60 transition-colors",
        grid ? "min-h-[220px]" : "w-72 shrink-0",
        isOver ? "border-brand-400 bg-brand-50/60" : "border-[var(--border)]",
      )}
      aria-label={col.label}
    >
      <header className="flex items-center gap-2 px-3 pt-3">
        <span className={cn("h-2 w-2 rounded-full", toneBar[col.tone ?? "neutral"])} aria-hidden />
        <h3 className="text-sm font-semibold text-navy-900">{col.label}</h3>
        <span className="rounded-full bg-white px-1.5 text-xs text-[var(--muted)] ring-1 ring-[var(--border)]">{count}</span>
        {col.hint ? <span className="ml-auto text-xs text-[var(--muted)]">{col.hint}</span> : null}
      </header>
      <div className="flex flex-1 flex-col gap-2 p-3">{children}</div>
    </section>
  );
}

function Card({ card, href, readOnly }: { card: BoardCard; href: string; readOnly?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: readOnly });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const overdue = card.due_date && card.status !== "completed" && card.status !== "cancelled" && new Date(card.due_date + "T23:59:59") < new Date();
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn("group rounded-lg border border-[var(--border)] bg-white p-3 shadow-sm", isDragging && "z-10 rotate-1 shadow-lg ring-2 ring-brand-400")}
    >
      <div className="flex items-start gap-2">
        {!readOnly ? (
          <button type="button" {...listeners} {...attributes} className="-ml-1 mt-0.5 cursor-grab touch-none text-navy-300 hover:text-navy-600" aria-label={`Move ${card.title}`}>
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <Link href={href} scroll={false} className="flex-1 text-sm font-medium text-navy-900 hover:text-brand-800">
          {card.title}
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        {card.priority === "urgent" || card.priority === "high" ? (
          <span className={cn("rounded px-1.5 py-0.5 font-medium", card.priority === "urgent" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{card.priority}</span>
        ) : null}
        {card.due_date ? (
          <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-red-600")}>
            <CalendarDays className="h-3 w-3" /> {formatShortDate(card.due_date)}
          </span>
        ) : null}
        {card.checklist && card.checklist.total ? <span>☑ {card.checklist.done}/{card.checklist.total}</span> : null}
        {card.project ? <span className="truncate">{card.project}</span> : null}
        {card.assignee ? <span className="ml-auto rounded-full bg-navy-100 px-1.5 py-0.5 text-navy-700">{card.assignee}</span> : null}
      </div>
    </article>
  );
}
