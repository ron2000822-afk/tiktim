import { and, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { slugify } from "@tiktim/shared";
import { db } from "@tiktim/db";
import {
  artistGenres,
  artists,
  categories,
  eventArtists,
  events,
  ingestionRuns,
  rawListings,
  reviewQueue,
  sources,
  ticketOffers,
} from "@tiktim/db/schema";
import type { Connector, NormalizedListing } from "../connectors/types";
import { parseTitle } from "./parse-title";
import { resolveArtist, createUnverifiedArtist } from "./resolve-artist";
import { disambiguateArtist } from "./disambiguate-artist";
import { resolveCity, resolveVenue, createUnverifiedVenue } from "./resolve-venue";
import { decideEventMatch, type EventCandidate } from "./match-event";
import { suggestGenres } from "./classify-genre";
import { findArtistImage } from "./find-artist-image";

export type PipelineReport = {
  sourceSlug: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  status: "running" | "success" | "partial" | "failed";
  fetched: number;
  created: number;
  updated: number;
  merged: number;
  queued: number;
  errors: number;
  errorSample: string[];
};

const PUBLISH_CONFIDENCE_THRESHOLD = 0.85;
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomShortId(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += BASE62[Math.floor(Math.random() * BASE62.length)];
  return out;
}

function hashPayload(payload: unknown): string {
  // Lightweight content hash — good enough to detect changes, no crypto
  // import needed beyond what's already used for UUIDs.
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export async function ensureSource(connector: Connector) {
  const [existing] = await db.select().from(sources).where(eq(sources.slug, connector.slug)).limit(1);
  if (existing) return existing;

  const kind = connector.tier === 1 ? "api" : connector.tier === 2 ? "feed" : connector.tier === 4 ? "manual" : "scrape";
  const [created] = await db
    .insert(sources)
    .values({
      slug: connector.slug,
      nameHe: connector.slug,
      kind,
      tier: connector.tier,
      isActive: connector.tier === 1 || connector.tier === 4,
    })
    .returning();
  return created;
}

export async function processListing(
  listing: NormalizedListing,
  source: typeof sources.$inferSelect,
  connector: Connector,
): Promise<"created" | "merged" | "queued_only" | "skipped"> {
  if (listing.categoryHint !== "music" && listing.categoryHint !== "standup") {
    return "skipped";
  }

  const [category] = await db.select().from(categories).where(eq(categories.slug, listing.categoryHint)).limit(1);
  if (!category) return "skipped";

  const cityId = await resolveCity(listing.cityName);
  if (!cityId) {
    await db.insert(reviewQueue).values({
      kind: "unmatched_venue",
      payload: { venueName: listing.venueName, cityName: listing.cityName, reason: "city_unresolved", sourceSlug: listing.sourceSlug, externalId: listing.externalId },
      createdBy: "pipeline",
    });
    return "queued_only";
  }

  let venueResolution = await resolveVenue(listing.venueName, cityId);
  let venueId: string;
  let venueWasUnverified = false;
  if (venueResolution.kind === "matched") {
    venueId = venueResolution.venueId;
  } else {
    venueId = await createUnverifiedVenue(listing.venueName, cityId);
    venueWasUnverified = true;
    await db.insert(reviewQueue).values({
      kind: "unmatched_venue",
      payload: { venueName: listing.venueName, createdVenueId: venueId, sourceSlug: listing.sourceSlug, externalId: listing.externalId },
      createdBy: "pipeline",
    });
  }

  const parsedTitle = listing.artistNames.length > 0 ? { artistNames: listing.artistNames, tourName: listing.tourName } : parseTitle(listing.title, listing.venueName);

  if (parsedTitle.artistNames.length === 0) {
    await db.insert(reviewQueue).values({
      kind: "low_confidence_event",
      payload: { reason: "no_artist_parsed", listing },
      createdBy: "pipeline",
    });
    return "queued_only";
  }

  const resolvedArtistIds: { id: string; confidence: number; wasUnverified: boolean }[] = [];
  for (const name of parsedTitle.artistNames) {
    const decision = await resolveArtist(name);
    if (decision.kind === "accepted") {
      resolvedArtistIds.push({ id: decision.artistId, confidence: decision.confidence, wasUnverified: false });
    } else if (decision.kind === "ambiguous") {
      const aiPick = await disambiguateArtist(name, decision.topCandidates);
      if (aiPick) {
        await db.insert(reviewQueue).values({
          kind: "unmatched_artist",
          payload: { rawName: name, aiPickedArtistId: aiPick, candidates: decision.topCandidates },
          confidence: 0.6,
          relatedArtistId: aiPick,
          createdBy: "pipeline",
        });
        resolvedArtistIds.push({ id: aiPick, confidence: 0.6, wasUnverified: false });
      } else {
        const newId = await createUnverifiedArtist(name);
        await db.insert(reviewQueue).values({
          kind: "unmatched_artist",
          payload: { rawName: name, createdArtistId: newId, candidates: decision.topCandidates },
          relatedArtistId: newId,
          createdBy: "pipeline",
        });
        resolvedArtistIds.push({ id: newId, confidence: 0.5, wasUnverified: true });
      }
    } else {
      const newId = await createUnverifiedArtist(name);
      await db.insert(reviewQueue).values({
        kind: "unmatched_artist",
        payload: { rawName: name, createdArtistId: newId },
        relatedArtistId: newId,
        createdBy: "pipeline",
      });
      resolvedArtistIds.push({ id: newId, confidence: 0.5, wasUnverified: true });
    }
  }

  const headliner = resolvedArtistIds[0];
  const startsAt = new Date(listing.startsAt);
  if (Number.isNaN(startsAt.getTime())) return "skipped";

  const windowMs = 90 * 60 * 1000;
  const candidateRows = await db
    .select({ id: events.id, startsAt: events.startsAt, artistId: eventArtists.artistId })
    .from(events)
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .where(
      and(
        eq(events.venueId, venueId),
        ne(events.status, "cancelled"),
        gte(events.startsAt, new Date(startsAt.getTime() - windowMs)),
        lte(events.startsAt, new Date(startsAt.getTime() + windowMs)),
      ),
    );
  const candidates: EventCandidate[] = candidateRows.map((r) => ({ id: r.id, headlinerArtistId: r.artistId, startsAt: r.startsAt }));
  const matchDecision = decideEventMatch(candidates, headliner.id, startsAt);

  const now = new Date();
  let eventId: string;
  let result: "created" | "merged";

  if (matchDecision.kind === "merge") {
    eventId = matchDecision.eventId;
    await db.update(events).set({ lastSeenAt: now }).where(eq(events.id, eventId));
    result = "merged";
  } else {
    const confidence = Math.min(headliner.confidence, venueWasUnverified ? 0.5 : 1);
    const shouldPublish = confidence >= PUBLISH_CONFIDENCE_THRESHOLD;

    const [created] = await db
      .insert(events)
      .values({
        slug: slugify(parsedTitle.artistNames[0]) || "event",
        shortId: randomShortId(),
        title: listing.title,
        tourName: parsedTitle.tourName,
        categoryId: category.id,
        venueId,
        startsAt,
        doorsAt: listing.doorsAt ? new Date(listing.doorsAt) : undefined,
        status: listing.status ?? "scheduled",
        currency: listing.currency ?? "ILS",
        imageUrl: listing.imageUrl,
        imageCredit: listing.imageCredit,
        confidence,
        firstSeenAt: now,
        lastSeenAt: now,
        publishedAt: shouldPublish ? now : undefined,
      })
      .returning({ id: events.id });
    eventId = created.id;
    result = "created";

    if (!shouldPublish) {
      await db.insert(reviewQueue).values({
        kind: "low_confidence_event",
        payload: { listing, confidence },
        confidence,
        relatedEventId: eventId,
        createdBy: "pipeline",
      });
    }

    if (matchDecision.kind === "possible_duplicate") {
      await db.insert(reviewQueue).values({
        kind: "possible_duplicate",
        payload: { newEventId: eventId, existingEventId: matchDecision.eventId, confidence: matchDecision.confidence },
        confidence: matchDecision.confidence,
        relatedEventId: eventId,
        createdBy: "pipeline",
      });
    }
  }

  for (const [index, artist] of resolvedArtistIds.entries()) {
    await db
      .insert(eventArtists)
      .values({ eventId, artistId: artist.id, role: index === 0 ? "headliner" : "support", billingOrder: index })
      .onConflictDoNothing();
  }

  const affiliateUrl =
    connector.buildAffiliateUrl && source.affiliateConfig
      ? connector.buildAffiliateUrl(listing.url, source.affiliateConfig as Record<string, unknown>)
      : undefined;
  await db
    .insert(ticketOffers)
    .values({
      eventId,
      sourceId: source.id,
      externalId: listing.externalId,
      url: listing.url,
      affiliateUrl,
      priceMin: listing.priceMin !== undefined ? String(listing.priceMin) : undefined,
      priceMax: listing.priceMax !== undefined ? String(listing.priceMax) : undefined,
      availability: listing.availability ?? "unknown",
      missedRuns: 0,
      isActive: true,
      lastCheckedAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [ticketOffers.sourceId, ticketOffers.externalId],
      set: {
        url: listing.url,
        affiliateUrl,
        priceMin: listing.priceMin !== undefined ? String(listing.priceMin) : undefined,
        priceMax: listing.priceMax !== undefined ? String(listing.priceMax) : undefined,
        availability: listing.availability ?? "unknown",
        missedRuns: 0,
        isActive: true,
        lastCheckedAt: now,
        lastSeenAt: now,
      },
    });

  const [priceAgg] = await db
    .select({ min: sql<string | null>`min(price_min)`, max: sql<string | null>`max(price_max)` })
    .from(ticketOffers)
    .where(and(eq(ticketOffers.eventId, eventId), eq(ticketOffers.isActive, true)));
  // `?? undefined` would drop both keys from the update's set() when no
  // offer has a price (common for real listings — not yet on sale, dynamic
  // pricing), and Drizzle throws "No values to set" on an empty set() —
  // confirmed live: 50/65 real Ticketmaster listings failed on this exact
  // path. `?? null` keeps the keys present so the column is explicitly
  // cleared instead.
  await db
    .update(events)
    .set({ minPrice: priceAgg?.min ?? null, maxPrice: priceAgg?.max ?? null })
    .where(eq(events.id, eventId));

  const existingGenres = await db.select().from(artistGenres).where(eq(artistGenres.artistId, headliner.id)).limit(1);
  if (existingGenres.length === 0) {
    const suggested = await suggestGenres(parsedTitle.artistNames[0], listing.categoryHint);
    if (suggested && suggested.length > 0) {
      await db.insert(reviewQueue).values({
        kind: "genre_suggestion",
        payload: { artistId: headliner.id, genreSlugs: suggested },
        relatedArtistId: headliner.id,
        createdBy: "pipeline",
      });
    }
  }

  // Not every seller gives an event its own photo (see
  // declassifyGenericImages above) — fall back to a free-licensed photo of
  // the headliner from Wikimedia Commons, with credit + license, per
  // CLAUDE.md's "Artist images: Wikimedia Commons" rule. An exact-title
  // match is a factual lookup against a specific named source and applies
  // directly, same as genre suggestions don't — but a search-based match
  // (no exact title found) is confirmed live to sometimes resolve to a
  // completely different real person, so that tier goes through admin
  // review instead of auto-applying. Only attempted once per artist
  // (skipped if an image, or an unresolved suggestion, already exists).
  const [artistRow] = await db.select({ nameHe: artists.nameHe, imageUrl: artists.imageUrl }).from(artists).where(eq(artists.id, headliner.id)).limit(1);
  if (artistRow && !artistRow.imageUrl) {
    const [existingSuggestion] = await db
      .select({ id: reviewQueue.id })
      .from(reviewQueue)
      .where(and(eq(reviewQueue.kind, "artist_image_suggestion"), eq(reviewQueue.relatedArtistId, headliner.id)))
      .limit(1);

    if (!existingSuggestion) {
      const found = await findArtistImage(parsedTitle.artistNames[0]);
      if (found?.confidence === "exact") {
        await db
          .update(artists)
          .set({ imageUrl: found.imageUrl, imageCredit: found.imageCredit, imageLicense: found.imageLicense })
          .where(eq(artists.id, headliner.id));
      } else if (found?.confidence === "search") {
        await db.insert(reviewQueue).values({
          kind: "artist_image_suggestion",
          payload: {
            artistName: artistRow.nameHe,
            imageUrl: found.imageUrl,
            imageCredit: found.imageCredit,
            imageLicense: found.imageLicense,
            matchedTitle: found.matchedTitle,
          },
          relatedArtistId: headliner.id,
          createdBy: "pipeline",
        });
      }
    }
  }

  return result;
}

export async function runPipeline(connector: Connector, opts: { dryRun?: boolean; limit?: number } = {}): Promise<PipelineReport> {
  const startedAt = new Date();

  if (opts.dryRun) {
    let fetched = 0;
    let valid = 0;
    let invalid = 0;
    const categoryCounts: Record<string, number> = {};
    const controller = new AbortController();

    for await (const item of connector.fetch({ limit: opts.limit, signal: controller.signal })) {
      fetched++;
      try {
        const normalized = connector.normalize(item);
        if (normalized) {
          valid++;
          const cat = normalized.categoryHint ?? "unknown";
          categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        } else {
          invalid++;
        }
      } catch {
        invalid++;
      }
      if (opts.limit && fetched >= opts.limit) break;
    }

    return {
      sourceSlug: connector.slug,
      dryRun: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "success",
      fetched,
      created: valid,
      updated: 0,
      merged: 0,
      queued: 0,
      errors: invalid,
      errorSample: [`${valid}/${fetched} listings valid; by category: ${JSON.stringify(categoryCounts)}`],
    };
  }

  const source = await ensureSource(connector);

  if (!source.isActive) {
    return {
      sourceSlug: connector.slug,
      dryRun: false,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "success",
      fetched: 0,
      created: 0,
      updated: 0,
      merged: 0,
      queued: 0,
      errors: 0,
      errorSample: ["Source is inactive (sources.is_active = false) — skipped. Activate it in /admin to run this connector."],
    };
  }

  const [run] = await db
    .insert(ingestionRuns)
    .values({ sourceId: source.id, startedAt, status: "running" })
    .returning();

  const [lastSuccessfulRun] = await db
    .select()
    .from(ingestionRuns)
    .where(and(eq(ingestionRuns.sourceId, source.id), eq(ingestionRuns.status, "success"), ne(ingestionRuns.id, run.id)))
    .orderBy(sql`started_at desc`)
    .limit(1);

  let fetched = 0;
  let created = 0;
  let merged = 0;
  let queued = 0;
  let errors = 0;
  const errorSample: string[] = [];
  const controller = new AbortController();

  for await (const item of connector.fetch({
    since: lastSuccessfulRun?.finishedAt ?? undefined,
    limit: opts.limit,
    signal: controller.signal,
  })) {
    fetched++;
    try {
      const normalized = connector.normalize(item);

      await db
        .insert(rawListings)
        .values({
          sourceId: source.id,
          externalId: item.externalId,
          payload: item.payload,
          payloadHash: hashPayload(item.payload),
          runId: run.id,
          parseStatus: normalized ? "ok" : "skipped",
        })
        .onConflictDoUpdate({
          target: [rawListings.sourceId, rawListings.externalId],
          set: { payload: item.payload, payloadHash: hashPayload(item.payload), fetchedAt: new Date(), runId: run.id, parseStatus: normalized ? "ok" : "skipped" },
        });

      if (!normalized) continue;

      const outcome = await processListing(normalized, source, connector);
      if (outcome === "created") created++;
      else if (outcome === "merged") merged++;
      else if (outcome === "queued_only") queued++;
    } catch (error) {
      errors++;
      if (errorSample.length < 10) errorSample.push(error instanceof Error ? error.message : String(error));
      try {
        await db
          .insert(rawListings)
          .values({
            sourceId: source.id,
            externalId: item.externalId,
            payload: item.payload,
            payloadHash: hashPayload(item.payload),
            runId: run.id,
            parseStatus: "error",
            parseError: error instanceof Error ? error.message : String(error),
          })
          .onConflictDoUpdate({
            target: [rawListings.sourceId, rawListings.externalId],
            set: { parseStatus: "error", parseError: error instanceof Error ? error.message : String(error), runId: run.id },
          });
      } catch {
        // best-effort error logging; don't let it crash the run
      }
    }
    if (opts.limit && fetched >= opts.limit) break;
  }

  await applyStaleness(source.id, run.id);

  const droppedSignificantly = lastSuccessfulRun && lastSuccessfulRun.fetched > 0 && fetched < lastSuccessfulRun.fetched * 0.7;
  const status = errors > 0 && errors === fetched ? "failed" : droppedSignificantly ? "partial" : "success";

  await db
    .update(ingestionRuns)
    .set({ finishedAt: new Date(), status, fetched, created, updated: merged, merged, queued, errors, errorSample })
    .where(eq(ingestionRuns.id, run.id));

  await triggerRevalidation();

  return {
    sourceSlug: connector.slug,
    dryRun: false,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    status,
    fetched,
    created,
    updated: merged,
    merged,
    queued,
    errors,
    errorSample,
  };
}

async function applyStaleness(sourceId: string, currentRunId: string) {
  const staleOffers = await db
    .update(ticketOffers)
    .set({ missedRuns: sql`${ticketOffers.missedRuns} + 1` })
    .where(and(eq(ticketOffers.sourceId, sourceId), lt(ticketOffers.lastSeenAt, sql`(select started_at from ${ingestionRuns} where id = ${currentRunId})`)))
    .returning({ id: ticketOffers.id, missedRuns: ticketOffers.missedRuns, eventId: ticketOffers.eventId });

  const toDeactivate = staleOffers.filter((o) => o.missedRuns >= 2).map((o) => o.id);
  if (toDeactivate.length > 0) {
    await db.update(ticketOffers).set({ isActive: false }).where(inArray(ticketOffers.id, toDeactivate));
  }

  const affectedEventIds = [...new Set(staleOffers.map((o) => o.eventId))];
  for (const eventId of affectedEventIds) {
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ticketOffers)
      .where(and(eq(ticketOffers.eventId, eventId), eq(ticketOffers.isActive, true)));
    if (Number(activeCount.count) === 0) {
      await db
        .update(events)
        .set({ status: "unavailable" })
        .where(and(eq(events.id, eventId), sql`${events.startsAt} > now()`, ne(events.status, "cancelled")));
    }
  }
}

async function triggerRevalidation() {
  const secret = process.env.REVALIDATE_SECRET;
  const siteUrl = process.env.SITE_URL;
  if (!secret || !siteUrl) return;
  try {
    await fetch(`${siteUrl}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
  } catch {
    // Revalidation is best-effort; ISR will catch up within its own window regardless.
  }
}

/** Sets status='past' for events more than 6 hours after starts_at. Run daily, separate from the per-source pipeline. */
export async function markPastEvents(): Promise<number> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const result = await db
    .update(events)
    .set({ status: "past" })
    .where(and(lt(events.startsAt, sixHoursAgo), ne(events.status, "past"), ne(events.status, "cancelled")))
    .returning({ id: events.id });
  return result.length;
}

// Not every seller gives each event its own photo — Ticketmaster in
// particular falls back to a generic venue/placeholder image for many
// listings, and the same URL ends up attached to dozens of unrelated
// events (one placeholder was shared by 41 real events in production).
// A single reused photo looks worse than the card's own gradient
// fallback, so anything shared by more than a couple of events gets
// treated as "no real image" rather than shown.
export async function declassifyGenericImages(): Promise<number> {
  const result = await db.execute<{ id: string }>(sql`
    with generic as (
      select image_url from events where image_url is not null group by image_url having count(*) > 2
    )
    update events set image_url = null where image_url in (select image_url from generic)
    returning id
  `);
  return result.length;
}
