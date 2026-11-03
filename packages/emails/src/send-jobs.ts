import "./load-env";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@tiktim/db";
import {
  artistGenres,
  artists,
  cities,
  emailSubscriptions,
  eventArtists,
  events,
  follows,
  genres,
  notificationsLog,
  profiles,
  promotions,
  savedEvents,
  venues,
} from "@tiktim/db/schema";

const primaryArtistGenres = alias(artistGenres, "digest_primary_artist_genres");
const primaryGenre = alias(genres, "digest_primary_genre");
import { sendEmail } from "./client";
import { NewShowAlert } from "./templates/NewShowAlert";
import { SavedEventReminder } from "./templates/SavedEventReminder";
import { StatusChangeNotice } from "./templates/StatusChangeNotice";
import { WeeklyDigest } from "./templates/WeeklyDigest";
import type { EmailEventSummary } from "./templates/EventSummary";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

function unsubscribeUrl(token: string) {
  return `${SITE_URL}/newsletter/unsubscribe?token=${token}`;
}

function eventUrl(slug: string, shortId: string) {
  return `${SITE_URL}/event/${slug}-${shortId}`;
}

const eventJoinColumns = {
  id: events.id,
  slug: events.slug,
  shortId: events.shortId,
  title: events.title,
  startsAt: events.startsAt,
  status: events.status,
  minPrice: events.minPrice,
  venueName: venues.name,
  cityNameHe: cities.nameHe,
};

function baseEventQuery() {
  return db
    .select(eventJoinColumns)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id));
}

function toSummary(row: { title: string; venueName: string; cityNameHe: string; startsAt: Date; minPrice: string | null; slug: string; shortId: string }): EmailEventSummary {
  return {
    title: row.title,
    venueName: row.venueName,
    cityNameHe: row.cityNameHe,
    startsAt: row.startsAt,
    minPrice: row.minPrice,
    url: eventUrl(row.slug, row.shortId),
  };
}

/** Marks a notification as sent (unique dedupe key) before sending, so a
 *  crashed/overlapping run can never double-send. Returns false if it was
 *  already sent. */
async function claimNotification(input: {
  userId: string | null;
  email: string;
  kind: "new_show" | "reminder_7d" | "reminder_1d" | "status_change" | "newsletter";
  eventId: string | null;
  dedupeKey: string;
}): Promise<boolean> {
  const [row] = await db
    .insert(notificationsLog)
    .values(input)
    .onConflictDoNothing({ target: notificationsLog.dedupeKey })
    .returning({ id: notificationsLog.id });
  return Boolean(row);
}

async function sendNewShowAlerts() {
  const rows = await db
    .select({
      userId: follows.userId,
      email: emailSubscriptions.email,
      alertsFrequency: emailSubscriptions.alertsFrequency,
      unsubscribeToken: emailSubscriptions.unsubscribeToken,
      artistNameHe: artists.nameHe,
      event: eventJoinColumns,
    })
    .from(follows)
    .innerJoin(eventArtists, and(eq(eventArtists.artistId, follows.targetId), eq(eventArtists.role, "headliner")))
    .innerJoin(events, eq(events.id, eventArtists.eventId))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(artists, eq(artists.id, follows.targetId))
    .innerJoin(emailSubscriptions, eq(emailSubscriptions.userId, follows.userId))
    .where(
      and(
        eq(follows.targetType, "artist"),
        gte(events.startsAt, new Date()),
        isNotNull(events.publishedAt),
        ne(emailSubscriptions.alertsFrequency, "off"),
        isNull(emailSubscriptions.unsubscribedAt),
      ),
    );

  let sent = 0;
  for (const row of rows) {
    const dedupeKey = `new_show:${row.userId}:${row.event.id}`;
    const claimed = await claimNotification({ userId: row.userId, email: row.email, kind: "new_show", eventId: row.event.id, dedupeKey });
    if (!claimed) continue;

    await sendEmail({
      to: row.email,
      subject: `${row.artistNameHe}: הופעה חדשה`,
      react: NewShowAlert({ artistNameHe: row.artistNameHe, event: toSummary(row.event), unsubscribeUrl: unsubscribeUrl(row.unsubscribeToken) }),
    });
    sent++;
  }
  console.log(`[emails] new_show: ${sent} sent`);
}

async function sendSavedEventReminders() {
  const now = Date.now();
  const windows: { days: 7 | 1; from: Date; to: Date }[] = [
    { days: 7, from: new Date(now + 6.5 * 86400000), to: new Date(now + 7.5 * 86400000) },
    { days: 1, from: new Date(now + 0.5 * 86400000), to: new Date(now + 1.5 * 86400000) },
  ];

  let sent = 0;
  for (const window of windows) {
    const rows = await db
      .select({
        userId: savedEvents.userId,
        email: emailSubscriptions.email,
        unsubscribeToken: emailSubscriptions.unsubscribeToken,
        event: eventJoinColumns,
      })
      .from(savedEvents)
      .innerJoin(events, eq(events.id, savedEvents.eventId))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(cities, eq(venues.cityId, cities.id))
      .innerJoin(emailSubscriptions, eq(emailSubscriptions.userId, savedEvents.userId))
      .where(
        and(
          gte(events.startsAt, window.from),
          lte(events.startsAt, window.to),
          ne(emailSubscriptions.alertsFrequency, "off"),
          isNull(emailSubscriptions.unsubscribedAt),
        ),
      );

    for (const row of rows) {
      const kind = window.days === 7 ? ("reminder_7d" as const) : ("reminder_1d" as const);
      const dedupeKey = `${kind}:${row.userId}:${row.event.id}`;
      const claimed = await claimNotification({ userId: row.userId, email: row.email, kind, eventId: row.event.id, dedupeKey });
      if (!claimed) continue;

      await sendEmail({
        to: row.email,
        subject: window.days === 7 ? "ההופעה השמורה שלכם בעוד שבוע" : "ההופעה השמורה שלכם מחר",
        react: SavedEventReminder({ daysUntil: window.days, event: toSummary(row.event), unsubscribeUrl: unsubscribeUrl(row.unsubscribeToken) }),
      });
      sent++;
    }
  }
  console.log(`[emails] reminders: ${sent} sent`);
}

async function sendStatusChangeNotices() {
  const WATCHED_STATUSES = ["postponed", "cancelled", "few_left"] as const;

  const rows = await db
    .select({
      userId: savedEvents.userId,
      email: emailSubscriptions.email,
      unsubscribeToken: emailSubscriptions.unsubscribeToken,
      event: eventJoinColumns,
    })
    .from(savedEvents)
    .innerJoin(events, eq(events.id, savedEvents.eventId))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(emailSubscriptions, eq(emailSubscriptions.userId, savedEvents.userId))
    .where(
      and(
        inArray(events.status, [...WATCHED_STATUSES]),
        ne(emailSubscriptions.alertsFrequency, "off"),
        isNull(emailSubscriptions.unsubscribedAt),
      ),
    );

  let sent = 0;
  for (const row of rows) {
    const status = row.event.status as (typeof WATCHED_STATUSES)[number];
    const dedupeKey = `status_change:${row.userId}:${row.event.id}:${status}`;
    const claimed = await claimNotification({ userId: row.userId, email: row.email, kind: "status_change", eventId: row.event.id, dedupeKey });
    if (!claimed) continue;

    await sendEmail({
      to: row.email,
      subject: "עדכון להופעה השמורה שלכם",
      react: StatusChangeNotice({ status, event: toSummary(row.event), unsubscribeUrl: unsubscribeUrl(row.unsubscribeToken) }),
    });
    sent++;
  }
  console.log(`[emails] status_change: ${sent} sent`);
}

async function getSponsoredDigestEvent(): Promise<EmailEventSummary | undefined> {
  const now = new Date();
  const [row] = await baseEventQuery()
    .innerJoin(promotions, eq(promotions.eventId, events.id))
    .where(and(eq(promotions.slot, "newsletter"), eq(promotions.isActive, true), lte(promotions.startsAt, now), gte(promotions.endsAt, now)))
    .limit(1);
  return row ? toSummary(row) : undefined;
}

async function getPersonalizedWeeklyEvents(userId: string): Promise<EmailEventSummary[]> {
  const [followedArtists, followedGenres, followedCities, [profile]] = await Promise.all([
    db.select({ targetId: follows.targetId }).from(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, "artist"))),
    db.select({ targetId: follows.targetId }).from(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, "genre"))),
    db.select({ targetId: follows.targetId }).from(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, "city"))),
    db.select({ homeRegionId: profiles.homeRegionId }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ]);

  const artistIds = followedArtists.map((r) => r.targetId);
  const genreIds = followedGenres.map((r) => r.targetId);
  const cityIds = followedCities.map((r) => r.targetId);
  const homeRegionId = profile?.homeRegionId ?? null;

  const signals = [
    artistIds.length ? inArray(eventArtists.artistId, artistIds) : undefined,
    genreIds.length ? inArray(primaryGenre.id, genreIds) : undefined,
    cityIds.length ? inArray(cities.id, cityIds) : undefined,
    homeRegionId ? eq(cities.regionId, homeRegionId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  if (signals.length === 0) return [];

  const rows = await baseEventQuery()
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .leftJoin(primaryArtistGenres, and(eq(primaryArtistGenres.artistId, eventArtists.artistId), eq(primaryArtistGenres.isPrimary, true)))
    .leftJoin(primaryGenre, eq(primaryGenre.id, primaryArtistGenres.genreId))
    .where(and(gte(events.startsAt, new Date()), isNotNull(events.publishedAt), or(...signals)))
    .orderBy(asc(events.startsAt))
    .limit(6);

  return rows.map(toSummary);
}

async function getGenericWeeklyEvents(): Promise<EmailEventSummary[]> {
  const rows = await baseEventQuery()
    .where(and(gte(events.startsAt, new Date()), isNotNull(events.publishedAt)))
    .orderBy(desc(events.hotScore), asc(events.startsAt))
    .limit(6);
  return rows.map(toSummary);
}

async function sendWeeklyDigest() {
  const sponsoredEvent = await getSponsoredDigestEvent();

  const subscribers = await db
    .select({ email: emailSubscriptions.email, userId: emailSubscriptions.userId, unsubscribeToken: emailSubscriptions.unsubscribeToken })
    .from(emailSubscriptions)
    .where(
      and(
        eq(emailSubscriptions.newsletterFrequency, "weekly"),
        isNotNull(emailSubscriptions.confirmedAt),
        isNull(emailSubscriptions.unsubscribedAt),
      ),
    );

  const weekKey = new Date().toISOString().slice(0, 10);
  let sent = 0;

  for (const sub of subscribers) {
    const dedupeKey = `newsletter:${sub.email}:${weekKey}`;
    const claimed = await claimNotification({ userId: sub.userId, email: sub.email, kind: "newsletter", eventId: null, dedupeKey });
    if (!claimed) continue;

    const events = sub.userId ? await getPersonalizedWeeklyEvents(sub.userId) : await getGenericWeeklyEvents();
    const finalEvents = events.length > 0 ? events : await getGenericWeeklyEvents();

    await sendEmail({
      to: sub.email,
      subject: "מה יש בסופ\"ש?",
      react: WeeklyDigest({ events: finalEvents, sponsoredEvent, unsubscribeUrl: unsubscribeUrl(sub.unsubscribeToken) }),
    });
    sent++;
  }
  console.log(`[emails] newsletter: ${sent} sent`);
}

async function main() {
  const mode = process.argv[2];

  if (!mode || mode === "alerts") {
    await sendNewShowAlerts();
    await sendSavedEventReminders();
    await sendStatusChangeNotices();
  }

  if (mode === "digest") {
    await sendWeeklyDigest();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
