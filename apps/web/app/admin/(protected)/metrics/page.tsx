import type { Metadata } from "next";
import { connection } from "next/server";
import { listOutboundClicksBySource, listTopClickedEvents, listZeroResultSearches } from "@/lib/queries/admin-metrics";
import { ADMIN_COPY } from "../../copy";

export const metadata: Metadata = { title: ADMIN_COPY.metrics.title };
export const instant = false;

export default async function MetricsPage() {
  await connection();

  const [bySource, topEvents, zeroResults] = await Promise.all([
    listOutboundClicksBySource(),
    listTopClickedEvents(),
    listZeroResultSearches(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{ADMIN_COPY.metrics.title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{ADMIN_COPY.metrics.intro}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ADMIN_COPY.metrics.clicksBySourceTitle}</h2>
        {bySource.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.metrics.empty}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.source}</th>
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.count}</th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((row) => (
                <tr key={row.sourceNameHe} className="border-b border-[var(--border)]">
                  <td className="py-2">{row.sourceNameHe}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ADMIN_COPY.metrics.topEventsTitle}</h2>
        {topEvents.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.metrics.empty}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.event}</th>
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.count}</th>
              </tr>
            </thead>
            <tbody>
              {topEvents.map((row) => (
                <tr key={row.eventId} className="border-b border-[var(--border)]">
                  <td className="py-2">{row.title}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{ADMIN_COPY.metrics.zeroResultsTitle}</h2>
        {zeroResults.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.metrics.empty}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.query}</th>
                <th className="py-2 text-start">{ADMIN_COPY.metrics.columns.searchCount}</th>
              </tr>
            </thead>
            <tbody>
              {zeroResults.map((row, i) => (
                <tr key={`${row.query}-${i}`} className="border-b border-[var(--border)]">
                  <td className="py-2">{row.query}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
