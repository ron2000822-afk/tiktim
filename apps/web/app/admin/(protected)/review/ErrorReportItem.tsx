"use client";

import { useTransition } from "react";
import { resolveErrorReport } from "./actions";
import { ADMIN_COPY } from "../../copy";

type ErrorReportRow = {
  id: string;
  eventId: string;
  eventTitle: string;
  kind: string;
  message: string | null;
  contactEmail: string | null;
  createdAt: Date;
};

export function ErrorReportItem({ row }: { row: ErrorReportRow }) {
  const [pending, startTransition] = useTransition();

  function resolve(status: "fixed" | "dismissed") {
    startTransition(async () => {
      await resolveErrorReport(row.id, status);
    });
  }

  const kindLabels = ADMIN_COPY.review.errorKindLabels as Record<string, string>;

  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold">
          {kindLabels[row.kind] ?? row.kind}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(row.createdAt)}
        </span>
      </div>
      <p className="font-semibold">{row.eventTitle}</p>
      {row.message && <p className="text-sm text-[var(--text-muted)]">{row.message}</p>}
      {row.contactEmail && <p className="text-xs text-[var(--text-muted)]" dir="ltr">{row.contactEmail}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => resolve("fixed")}
          className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
        >
          {ADMIN_COPY.review.markFixed}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => resolve("dismissed")}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]"
        >
          {ADMIN_COPY.review.dismiss}
        </button>
      </div>
    </div>
  );
}
