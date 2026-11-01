import { sql } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artists, events, venues } from "@tiktim/db/schema";
import { ADMIN_COPY } from "../copy";

export const instant = false;

export default async function AdminDashboardPage() {
  const [[eventCount], [artistCount], [venueCount]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(events),
    db.select({ count: sql<number>`count(*)` }).from(artists),
    db.select({ count: sql<number>`count(*)` }).from(venues),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.dashboard.title}</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-3xl font-bold">{eventCount.count}</div>
          <div className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.nav.events}</div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-3xl font-bold">{artistCount.count}</div>
          <div className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.nav.artists}</div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-3xl font-bold">{venueCount.count}</div>
          <div className="text-sm text-[var(--text-muted)]">{ADMIN_COPY.nav.venues}</div>
        </div>
      </div>
    </div>
  );
}
