import "./load-env";
import { sql } from "drizzle-orm";
import { db } from "@tiktim/db";

/**
 * One-off: re-score events that the OLD publish gate held back purely for
 * entity-resolution novelty (see the ARTIST_CONFIDENCE comment in
 * pipeline/run.ts). Those were all written at exactly confidence 0.5 — the
 * old "we created a new artist row" / "we created a new venue row" value.
 *
 * Confidence 0.6 (AI picked one of several existing artists) is deliberately
 * NOT touched: that's the one case that can attach an event to the wrong
 * artist, and it stays below the threshold for admin review.
 *
 * Past events are left alone — republishing a show that already happened
 * helps nobody.
 */
const BACKFILLED_CONFIDENCE = 0.9;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [before] = await db.execute<{ affected: number }>(sql`
    select count(*)::int as affected
    from events e
    where e.published_at is null
      and e.starts_at > now()
      and e.confidence = 0.5
      and exists (
        select 1 from ticket_offers o join sources s on s.id = o.source_id
        where o.event_id = e.id and s.slug not like 'seller-%'
      )
  `);
  console.log(`Events to publish: ${before.affected}${dryRun ? " (dry run — nothing written)" : ""}`);
  if (dryRun || before.affected === 0) return;

  const updated = await db.execute<{ id: string }>(sql`
    update events e
    set confidence = ${BACKFILLED_CONFIDENCE}, published_at = now()
    where e.published_at is null
      and e.starts_at > now()
      and e.confidence = 0.5
      and exists (
        select 1 from ticket_offers o join sources s on s.id = o.source_id
        where o.event_id = e.id and s.slug not like 'seller-%'
      )
    returning e.id
  `);
  console.log(`Published ${updated.length} event(s).`);

  // These were queued only because of the old gate, so leaving them open
  // would keep an admin staring at a 400-item list of non-problems.
  // resolved_by stays null — it's a FK to a real admin user, and no human
  // actually reviewed these.
  const resolved = await db.execute<{ id: string }>(sql`
    update review_queue rq
    set resolved_at = now()
    where rq.kind = 'low_confidence_event'
      and rq.resolved_at is null
      and rq.confidence = 0.5
    returning rq.id
  `);
  console.log(`Resolved ${resolved.length} stale low_confidence_event review item(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
