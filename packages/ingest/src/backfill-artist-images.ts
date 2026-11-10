import "./load-env";
import { eq, isNull } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artists } from "@tiktim/db/schema";
import { findArtistImage } from "./pipeline/find-artist-image";

// One-time (re-runnable) backfill for artists that existed before the
// Wikimedia image lookup was wired into the live ingestion pipeline —
// processListing() only looks one up when it first creates/sees an
// artist, so anyone already in the DB without an image needs this to
// catch up. Safe to re-run any time: it only touches artists where
// image_url is still null.
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const candidates = await db.select({ id: artists.id, nameHe: artists.nameHe }).from(artists).where(isNull(artists.imageUrl));

  console.log(`${candidates.length} artist(s) with no image. ${dryRun ? "(dry run — not writing)" : ""}`);

  let found = 0;
  for (const artist of candidates) {
    const result = await findArtistImage(artist.nameHe);
    if (!result) continue;
    found++;
    console.log(`  ${artist.nameHe} -> ${result.imageCredit} (${result.imageLicense})`);
    if (!dryRun) {
      await db
        .update(artists)
        .set({ imageUrl: result.imageUrl, imageCredit: result.imageCredit, imageLicense: result.imageLicense })
        .where(eq(artists.id, artist.id));
    }
  }

  console.log(`Found images for ${found} of ${candidates.length} artist(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
