"use client";

import { useActionState, useState } from "react";
import { EVENT_PAGE_COPY } from "@/app/lib/copy/event";
import { submitErrorReport } from "./actions";

const KIND_OPTIONS: Array<keyof typeof EVENT_PAGE_COPY.reportErrorKinds> = [
  "wrong_date",
  "wrong_price",
  "cancelled",
  "wrong_venue",
  "other",
];

async function action(_prevState: { ok: boolean }, formData: FormData) {
  return submitErrorReport(formData);
}

export function ErrorReportForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, { ok: false });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-[var(--text-muted)] underline">
        {EVENT_PAGE_COPY.reportError}
      </button>
    );
  }

  if (state.ok) {
    return <p className="text-sm text-[var(--status-new)]">{EVENT_PAGE_COPY.reportErrorThanks}</p>;
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <h3 className="font-bold">{EVENT_PAGE_COPY.reportErrorTitle}</h3>
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor="report-kind" className="mb-1 block text-sm">
          {EVENT_PAGE_COPY.reportErrorKindLabel}
        </label>
        <select
          id="report-kind"
          name="kind"
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          {KIND_OPTIONS.map((kind) => (
            <option key={kind} value={kind}>
              {EVENT_PAGE_COPY.reportErrorKinds[kind]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="report-message" className="mb-1 block text-sm">
          {EVENT_PAGE_COPY.reportErrorMessageLabel}
        </label>
        <textarea
          id="report-message"
          name="message"
          rows={3}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {EVENT_PAGE_COPY.reportErrorSubmit}
      </button>
    </form>
  );
}
