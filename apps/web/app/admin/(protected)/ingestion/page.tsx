import type { Metadata } from "next";
import { listSourcesWithLastRun } from "@/lib/queries/admin-ingestion";
import { ADMIN_COPY } from "../../copy";

export const metadata: Metadata = { title: ADMIN_COPY.ingestion.title };
export const instant = false;

const DROP_THRESHOLD = 0.3;

function isSignificantDrop(current: number, previous: number | null): boolean {
  if (previous === null || previous === 0) return false;
  return current < previous * (1 - DROP_THRESHOLD);
}

export default async function IngestionDashboardPage() {
  const rows = await listSourcesWithLastRun();
  const statusLabels = ADMIN_COPY.ingestion.statusLabels as Record<string, string>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{ADMIN_COPY.ingestion.title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{ADMIN_COPY.ingestion.intro}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.source}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.tier}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.lastRun}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.status}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.fetched}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.created}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.updated}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.merged}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.queued}</th>
              <th className="py-2 text-start">{ADMIN_COPY.ingestion.columns.errors}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ source, lastRun, previousRun }) => {
              const drop = lastRun ? isSignificantDrop(lastRun.fetched, previousRun?.fetched ?? null) : false;
              return (
                <tr key={source.id} className="border-b border-[var(--border)]">
                  <td className="py-2 font-semibold">
                    {source.nameHe}
                    {drop && (
                      <span className="ms-2 inline-block rounded-full bg-[var(--status-cancelled)] px-2 py-0.5 text-xs font-bold text-white">
                        {ADMIN_COPY.ingestion.dropAlert}
                      </span>
                    )}
                  </td>
                  <td className="py-2">{source.tier}</td>
                  <td className="py-2">
                    {lastRun
                      ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(lastRun.startedAt)
                      : ADMIN_COPY.ingestion.never}
                  </td>
                  <td className="py-2">{lastRun ? statusLabels[lastRun.status] ?? lastRun.status : "—"}</td>
                  <td className="py-2">{lastRun?.fetched ?? "—"}</td>
                  <td className="py-2">{lastRun?.created ?? "—"}</td>
                  <td className="py-2">{lastRun?.updated ?? "—"}</td>
                  <td className="py-2">{lastRun?.merged ?? "—"}</td>
                  <td className="py-2">{lastRun?.queued ?? "—"}</td>
                  <td className="py-2">{lastRun?.errors ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
