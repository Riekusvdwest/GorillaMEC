"use client";

import { useFormStatus } from "react-dom";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { pendingText?: string; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1] }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** A select that submits its form as soon as the value changes. */
export function AutoSubmitSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
      className={cn(
        "h-8 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-navy-800 hover:border-[var(--border)] focus:border-brand-500 focus:outline-none",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function AutoSubmitCheckbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={cn("h-4 w-4 rounded border-navy-300 accent-brand-500", className)}
    />
  );
}

export function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary", "sm")}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : label}
    </button>
  );
}

/** Opens a native <dialog> containing any content (usually a form). */
export function Modal({
  trigger,
  title,
  children,
  triggerClassName,
  wide,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  triggerClassName?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClassName ?? buttonClass("primary", "md")} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className={cn("m-auto w-[calc(100%-2rem)] rounded-2xl border border-[var(--border)] bg-white p-0 shadow-2xl", wide ? "max-w-2xl" : "max-w-lg")}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="font-semibold text-navy-950">{title}</h2>
          <button type="button" className="rounded-md px-2 py-1 text-navy-400 hover:bg-navy-50 hover:text-navy-800" onClick={() => ref.current?.close()} aria-label="Close">
            ✕
          </button>
        </div>
        <div
          className="p-5"
          onSubmit={() => {
            // close after the form submits
            setTimeout(() => ref.current?.close(), 50);
          }}
        >
          {children}
        </div>
      </dialog>
    </>
  );
}
