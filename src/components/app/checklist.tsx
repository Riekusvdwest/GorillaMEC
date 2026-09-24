"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { setChecklist } from "@/app/app/actions/work";
import type { ChecklistItem } from "@/lib/types";

export function Checklist({ taskId, items: initial, readOnly }: { taskId: string; items: ChecklistItem[]; readOnly?: boolean }) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [, start] = useTransition();
  const save = (next: ChecklistItem[]) => {
    setItems(next);
    start(async () => {
      await setChecklist(taskId, next);
    });
  };
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      {items.length ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-navy-100">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <span className="text-xs text-[var(--muted)]">
            {done}/{items.length}
          </span>
        </div>
      ) : null}
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-navy-50">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={it.done}
              disabled={readOnly}
              onChange={(e) => save(items.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
            />
            <span className={it.done ? "flex-1 text-sm text-[var(--muted)] line-through" : "flex-1 text-sm text-navy-900"}>{it.text}</span>
            {!readOnly ? (
              <button type="button" className="invisible text-navy-300 hover:text-red-600 group-hover:visible" onClick={() => save(items.filter((_, j) => j !== i))} aria-label="Remove item">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {!readOnly ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            save([...items, { text: text.trim(), done: false }]);
            setText("");
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a checklist item"
            className="h-8 flex-1 rounded-md border border-[var(--border)] px-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-navy-500 hover:bg-navy-50" aria-label="Add item">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
