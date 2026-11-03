import type { Metadata } from "next";
import { connection } from "next/server";
import { listOpenErrorReports, listOpenReviewQueue } from "@/lib/queries/admin-review";
import { ADMIN_COPY } from "../../copy";
import { QueueItem } from "./QueueItem";
import { ErrorReportItem } from "./ErrorReportItem";

export const metadata: Metadata = { title: ADMIN_COPY.review.title };
export const instant = false;

export default async function ReviewQueuePage() {
  await connection();
  const [queueRows, errorRows] = await Promise.all([listOpenReviewQueue(), listOpenErrorReports()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{ADMIN_COPY.review.title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{ADMIN_COPY.review.intro}</p>
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
