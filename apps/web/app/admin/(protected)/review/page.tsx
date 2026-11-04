import type { Metadata } from "next";
import { connection } from "next/server";
import { listOpenErrorReports, listOpenReviewQueue } from "@/lib/queries/admin-review";
import { ADMIN_COPY } from "../../copy";
import { QueueItem } from "./QueueItem";
import { ErrorReportItem } from "./ErrorReportItem";
import { BulkApproveButton } from "./BulkApproveButton";

export const metadata: Metadata = { title: ADMIN_COPY.review.title };
export const instant = false;

// Mirrors BULK_SAFE_KINDS in actions.ts — kept in sync by hand since a
// "use server" file can only export async functions, not a shared
// constant.
const BULK_SAFE_KINDS = new Set(["low_confidence_event", "unmatched_artist", "unmatched_venue", "genre_suggestion"]);

export default async function ReviewQueuePage() {
  await connection();
  const [queueRows, errorRows] = await Promise.all([listOpenReviewQueue(), listOpenErrorReports()]);
  const bulkEligibleCount = queueRows.filter((row) => BULK_SAFE_KINDS.has(row.kind)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ADMIN_COPY.review.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{ADMIN_COPY.review.intro}</p>
        </div>
        <BulkApproveButton eligibleCount={bulkEligibleCount} />
      </div>

      <section className="space-y-3">
        {queueRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.review.empty}</p>
        ) : (
          queueRows.map((row) => <QueueItem key={row.id} row={row} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ADMIN_COPY.review.errorReportsTitle}</h2>
        {errorRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.review.errorReportsEmpty}</p>
        ) : (
          errorRows.map((row) => <ErrorReportItem key={row.id} row={row} />)
        )}
      </section>
    </div>
  );
}
