"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@tiktim/db";
import { artistGenres, artists, errorReports, eventArtists, events, genres, reviewQueue, ticketOffers } from "@tiktim/db/schema";
import { ensureSource, processListing } from "@tiktim/ingest/pipeline";
import { manualConnector } from "@tiktim/ingest/connectors/manual";
import type { NormalizedListing } from "@tiktim/ingest/connectors/types";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    throw new Error("Not authorized");
  }
  return user!.id;
}

async function resolveQueueEntry(id: string, resolvedBy: string, resolution: unknown) {
  await db.update(reviewQueue).set({ status: "approved", resolvedBy, resolvedAt: new Date(), resolution }).where(eq(reviewQueue.id, id));
}

async function rejectQueueEntry(id: string, resolvedBy: string) {
  await db.update(reviewQueue).set({ status: "rejected", resolvedBy, resolvedAt: new Date() }).where(eq(reviewQueue.id, id));
}

export async function approveUnverifiedArtist(queueId: string, artistId: string) {
  const uid = await assertAdmin();
  await db.update(artists).set({ isVerified: true }).where(eq(artists.id, artistId));
  await resolveQueueEntry(queueId, uid, { action: "confirmed_new_artist" });
  revalidatePath("/admin/review");
}

export async function rejectReviewEntry(queueId: string) {
  const uid = await assertAdmin();
  await rejectQueueEntry(queueId, uid);
  revalidatePath("/admin/review");
}

export async function resolvePossibleDuplicate(queueId: string, keepEventId: string, mergeAwayEventId: string) {
  const uid = await assertAdmin();
  if (keepEventId !== mergeAwayEventId) {
    await db.update(ticketOffers).set({ eventId: keepEventId }).where(eq(ticketOffers.eventId, mergeAwayEventId));
    await db.delete(eventArtists).where(eq(eventArtists.eventId, mergeAwayEventId));
    // review_queue.related_event_id has a restrict FK — repoint any rows
    // referencing the event about to be deleted before deleting it.
    await db.update(reviewQueue).set({ relatedEventId: keepEventId }).where(eq(reviewQueue.relatedEventId, mergeAwayEventId));
    await db.delete(events).where(eq(events.id, mergeAwayEventId));
  }
  await resolveQueueEntry(queueId, uid, { action: "merged", keptEventId: keepEventId });
  revalidatePath("/admin/review");
  revalidatePath("/admin/events");
}

export async function keepEventsSeparate(queueId: string) {
  const uid = await assertAdmin();
  await resolveQueueEntry(queueId, uid, { action: "kept_separate" });
  revalidatePath("/admin/review");
}

export async function approveGenreSuggestion(queueId: string, artistId: string, genreSlugs: string[]) {
  const uid = await assertAdmin();
  const genreRows = await db.select({ id: genres.id, slug: genres.slug }).from(genres).where(inArray(genres.slug, genreSlugs));
  for (const [index, slug] of genreSlugs.entries()) {
    const genre = genreRows.find((g) => g.slug === slug);
    if (!genre) continue;
    await db.insert(artistGenres).values({ artistId, genreId: genre.id, isPrimary: index === 0 }).onConflictDoNothing();
  }
  await resolveQueueEntry(queueId, uid, { action: "genres_applied", genreSlugs });
  revalidatePath("/admin/review");
  revalidatePath("/admin/artists");
}

export async function approveSubmission(queueId: string, payload: Record<string, string>) {
  const uid = await assertAdmin();
  if (!payload.url) {
    throw new Error("Cannot convert a submission without a ticket URL — add the event manually instead.");
  }
  const source = await ensureSource(manualConnector);

  const listing: NormalizedListing = {
    sourceSlug: "manual",
    externalId: `submission-${queueId}`,
    title: payload.artistName,
    artistNames: [payload.artistName],
    venueName: payload.venueName,
    cityName: payload.cityName,
    startsAt: new Date(payload.startsAt).toISOString(),
    categoryHint: payload.categoryHint === "standup" ? "standup" : "music",
    url: payload.url,
  };

  const outcome = await processListing(listing, source, manualConnector);
  await resolveQueueEntry(queueId, uid, { action: "converted_to_event", outcome });
  revalidatePath("/admin/review");
  revalidatePath("/admin/events");
}

export async function publishLowConfidenceEvent(queueId: string, eventId: string) {
  const uid = await assertAdmin();
  await db.update(events).set({ publishedAt: new Date() }).where(eq(events.id, eventId));
  await resolveQueueEntry(queueId, uid, { action: "published" });
  revalidatePath("/admin/review");
  revalidatePath("/admin/events");
}

export async function resolveErrorReport(id: string, status: "fixed" | "dismissed") {
  await assertAdmin();
  await db.update(errorReports).set({ status }).where(eq(errorReports.id, id));
  revalidatePath("/admin/review");
}
