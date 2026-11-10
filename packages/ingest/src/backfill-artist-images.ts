import "./load-env";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artists, reviewQueue } from "@tiktim/db/schema";
import { findArtistImage } from "./pipeline/find-artist-image";

// One-time (re-runnable) backfill for artists that existed before the
// Wikimedia image lookup was wired into the live ingestion pipeline —
// processListing() only looks one up when it first creates/sees an
// artist, so anyone already in the DB without an image needs this to
// catch up. Safe to re-run any time: it only touches artists with no
// image and no unresolved/already-decided image suggestion.
//
// Exact-title matches apply directly (same trust level as a
// seller-provided event photo). Search-based matches (no exact title
// found) go into the admin review queue instead — confirmed live that
// free-text search can resolve to a completely different real person,
// not just a disambiguation page, so those need a human to confirm
// before showing under an artist's name.
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const alreadySuggested = await db
    .select({ artistId: reviewQueue.relatedArtistId })
    .from(reviewQueue)
    .where(eq(reviewQueue.kind, "artist_image_suggestion"));
  const suggestedIds = alreadySuggested.map((r) => r.artistId).filter((id): id is string => id !== null);

  const candidates = await db
    .select({ id: artists.id, nameHe: artists.nameHe })
    .from(artists)
    .where(suggestedIds.length > 0 ? and(isNull(artists.imageUrl), notInArray(artists.id, suggestedIds)) : isNull(artists.imageUrl));

  console.log(`${candidates.length} artist(s) with no image and no existing suggestion. ${dryRun ? "(dry run — not writing)" : ""}`);

  let applied = 0;
  let queued = 0;
  for (const artist of candidates) {
    const found = await findArtistImage(artist.nameHe);
    if (!found) continue;

    if (found.confidence === "exact") {
      applied++;
      console.log(`  [exact] ${artist.nameHe} -> ${found.imageCredit} (${found.imageLicense})`);
      if (!dryRun) {
        await db
          .update(artists)
          .set({ imageUrl: found.imageUrl, imageCredit: found.imageCredit, imageLicense: found.imageLicense })
          .where(eq(artists.id, artist.id));
      }
    } else {
      queued++;
      console.log(`  [needs review] ${artist.nameHe} -> matched "${found.matchedTitle}" (${found.imageCredit}, ${found.imageLicense})`);
      if (!dryRun) {
        await db.insert(reviewQueue).values({
          kind: "artist_image_suggestion",
          payload: {
            artistName: artist.nameHe,
            imageUrl: found.imageUrl,
            imageCredit: found.imageCredit,
            imageLicense: found.imageLicense,
            matchedTitle: found.matchedTitle,
          },
          relatedArtistId: artist.id,
          createdBy: "pipeline",
        });
      }
    }
  }

  console.log(`Applied ${applied} directly, queued ${queued} for review, of ${candidates.length} artist(s) checked.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
