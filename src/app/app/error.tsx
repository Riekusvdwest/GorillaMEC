"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-4 text-xl font-semibold text-navy-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{error.message && !error.message.includes("digest") ? error.message : "Please try again. If it keeps happening, email info@gorillamec.com."}</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
