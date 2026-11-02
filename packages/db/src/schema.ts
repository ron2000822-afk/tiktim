import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase manages this table; we only declare it so other tables can
// reference auth.users(id) as a foreign key. Never migrated by us.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

const citext = customType<{ data: string }>({ dataType: () => "citext" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// --- Enums ---

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled",
  "few_left",
  "sold_out",
  "postponed",
  "cancelled",
  "unavailable",
  "past",
]);

export const availabilityEnum = pgEnum("availability", [
  "available",
  "few_left",
  "sold_out",
  "unknown",
]);

export const artistRoleEnum = pgEnum("artist_role", ["headliner", "support", "lineup"]);

export const venueTypeEnum = pgEnum("venue_type", [
  "club",
  "hall",
  "theater",
  "amphitheater",
  "arena",
  "stadium",
  "outdoor",
  "bar",
  "other",
]);

export const sourceKindEnum = pgEnum("source_kind", [
  "api",
  "feed",
  "scrape",
  "manual",
  "submission",
]);

export const followTargetEnum = pgEnum("follow_target", ["artist", "genre", "city", "venue"]);

export const reviewKindEnum = pgEnum("review_kind", [
  "possible_duplicate",
  "unmatched_artist",
  "unmatched_venue",
  "genre_suggestion",
  "submission",
  "error_report",
  "low_confidence_event",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "open",
  "approved",
  "rejected",
  "merged",
]);

export const promoSlotEnum = pgEnum("promo_slot", ["hero", "genre_rail_top", "newsletter"]);

export const emailFrequencyEnum = pgEnum("email_frequency", [
  "instant",
  "daily",
  "weekly",
  "off",
]);

export const errorReportKindEnum = pgEnum("error_report_kind", [
  "wrong_date",
  "wrong_price",
  "cancelled",
  "wrong_venue",
  "other",
]);

export const errorReportStatusEnum = pgEnum("error_report_status", ["open", "fixed", "dismissed"]);

export const ingestionRunStatusEnum = pgEnum("ingestion_run_status", [
  "running",
  "success",
  "partial",
  "failed",
]);

export const rawListingParseStatusEnum = pgEnum("raw_listing_parse_status", [
  "ok",
  "error",
  "skipped",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "new_show",
  "reminder_7d",
  "reminder_1d",
  "status_change",
  "newsletter",
]);

// --- Taxonomy ---

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const cities = pgTable("cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  regionId: uuid("region_id")
    .notNull()
    .references(() => regions.id),
  lat: real("lat"),
  lng: real("lng"),
  ...timestamps,
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const genres = pgTable("genres", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  nameHe: text("name_he").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// --- Catalog ---

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    nameHe: text("name_he").notNull(),
    nameEn: text("name_en"),
    nameNorm: text("name_norm").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    aliasesNorm: text("aliases_norm").array().notNull().default(sql`'{}'::text[]`),
    isInternational: boolean("is_international").notNull().default(false),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    imageLicense: text("image_license"),
    bioShort: text("bio_short"),
    popularity: integer("popularity").notNull().default(0),
    isVerified: boolean("is_verified").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("artists_name_norm_trgm_idx").using("gin", sql`${table.nameNorm} gin_trgm_ops`),
    index("artists_aliases_norm_idx").using("gin", table.aliasesNorm),
  ],
);

export const artistGenres = pgTable(
  "artist_genres",
  {
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.artistId, table.genreId] }),
    uniqueIndex("artist_genres_one_primary_per_artist_idx").on(table.artistId).where(sql`${table.isPrimary} = true`),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameNorm: text("name_norm").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    aliasesNorm: text("aliases_norm").array().notNull().default(sql`'{}'::text[]`),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    address: text("address"),
    lat: real("lat"),
    lng: real("lng"),
    capacity: integer("capacity"),
    venueType: venueTypeEnum("venue_type").notNull().default("other"),
    isOutdoor: boolean("is_outdoor").notNull().default(false),
    accessibilityNotes: text("accessibility_notes"),
    website: text("website"),
    ...timestamps,
  },
  (table) => [index("venues_name_norm_trgm_idx").using("gin", sql`${table.nameNorm} gin_trgm_ops`)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    shortId: text("short_id").notNull().unique(),
    title: text("title").notNull(),
    tourName: text("tour_name"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    doorsAt: timestamp("doors_at", { withTimezone: true }),
    status: eventStatusEnum("status").notNull().default("scheduled"),
    minPrice: numeric("min_price", { precision: 10, scale: 2 }),
    maxPrice: numeric("max_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("ILS"),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    isFeatured: boolean("is_featured").notNull().default(false),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    genreOverride: uuid("genre_override").array(),
    confidence: real("confidence").notNull().default(1),
    hotScore: real("hot_score").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("events_starts_at_idx").on(table.startsAt),
    index("events_venue_starts_at_idx").on(table.venueId, table.startsAt),
    index("events_category_starts_at_idx").on(table.categoryId, table.startsAt),
    index("events_status_starts_at_idx").on(table.status, table.startsAt),
    index("events_tags_idx").using("gin", table.tags),
  ],
);

export const eventArtists = pgTable(
  "event_artists",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    role: artistRoleEnum("role").notNull().default("headliner"),
    billingOrder: integer("billing_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.artistId] })],
);

// --- Ingestion ---

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  kind: sourceKindEnum("kind").notNull(),
  tier: smallint("tier").notNull(),
  baseUrl: text("base_url"),
  affiliateProgram: text("affiliate_program"),
  affiliateConfig: jsonb("affiliate_config"),
  isActive: boolean("is_active").notNull().default(false),
  scheduleCron: text("schedule_cron"),
  legalApprovedAt: timestamp("legal_approved_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  notes: text("notes"),
  ...timestamps,
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestionRunStatusEnum("status").notNull().default("running"),
  fetched: integer("fetched").notNull().default(0),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  merged: integer("merged").notNull().default(0),
  queued: integer("queued").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  errorSample: jsonb("error_sample"),
});

export const ticketOffers = pgTable(
  "ticket_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    affiliateUrl: text("affiliate_url"),
    priceMin: numeric("price_min", { precision: 10, scale: 2 }),
    priceMax: numeric("price_max", { precision: 10, scale: 2 }),
    availability: availabilityEnum("availability").notNull().default("unknown"),
    missedRuns: integer("missed_runs").notNull().default(0),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [unique("ticket_offers_source_external_id_key").on(table.sourceId, table.externalId)],
);

export const rawListings = pgTable(
  "raw_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(),
    payload: jsonb("payload").notNull(),
    payloadHash: text("payload_hash").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    runId: uuid("run_id").references(() => ingestionRuns.id),
    parseStatus: rawListingParseStatusEnum("parse_status").notNull().default("ok"),
    parseError: text("parse_error"),
    matchedEventId: uuid("matched_event_id").references(() => events.id),
  },
  (table) => [unique("raw_listings_source_external_id_key").on(table.sourceId, table.externalId)],
);

export const reviewQueue = pgTable("review_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: reviewKindEnum("kind").notNull(),
  status: reviewStatusEnum("status").notNull().default("open"),
  payload: jsonb("payload").notNull(),
  confidence: real("confidence"),
  relatedEventId: uuid("related_event_id").references(() => events.id),
  relatedArtistId: uuid("related_artist_id").references(() => artists.id),
  createdBy: text("created_by").notNull().default("pipeline"),
  resolvedBy: uuid("resolved_by").references(() => authUsers.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolution: jsonb("resolution"),
  ...timestamps,
});

// --- Users ---

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  homeRegionId: uuid("home_region_id").references(() => regions.id),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  isAdmin: boolean("is_admin").notNull().default(false),
  ...timestamps,
});

export const follows = pgTable(
  "follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    targetType: followTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.targetType, table.targetId] })],
);

export const savedEvents = pgTable(
  "saved_events",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.eventId] })],
);

export const emailSubscriptions = pgTable("email_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  userId: uuid("user_id").references(() => authUsers.id),
  genres: uuid("genres").array().notNull().default(sql`'{}'::uuid[]`),
  regionIds: uuid("region_ids").array().notNull().default(sql`'{}'::uuid[]`),
  newsletterFrequency: emailFrequencyEnum("newsletter_frequency").notNull().default("weekly"),
  alertsFrequency: emailFrequencyEnum("alerts_frequency").notNull().default("instant"),
  confirmToken: text("confirm_token"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  consentSource: text("consent_source"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  ...timestamps,
});

export const notificationsLog = pgTable("notifications_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => authUsers.id),
  email: text("email").notNull(),
  kind: notificationKindEnum("kind").notNull(),
  eventId: uuid("event_id").references(() => events.id),
  dedupeKey: text("dedupe_key").notNull().unique(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  providerId: text("provider_id"),
});

// --- Monetization & feedback ---

export const outboundClicks = pgTable(
  "outbound_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => ticketOffers.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    sessionId: text("session_id").notNull(),
    userId: uuid("user_id").references(() => authUsers.id),
    page: text("page").notNull(),
    referrer: text("referrer"),
    utm: jsonb("utm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("outbound_clicks_created_at_idx").on(table.createdAt),
    index("outbound_clicks_source_created_at_idx").on(table.sourceId, table.createdAt),
  ],
);

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  slot: promoSlotEnum("slot").notNull(),
  genreId: uuid("genre_id").references(() => genres.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  advertiser: text("advertiser").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const errorReports = pgTable("error_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  kind: errorReportKindEnum("kind").notNull(),
  message: text("message"),
  contactEmail: text("contact_email"),
  status: errorReportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// "פרסמו אצלנו" contact form submissions (producers/advertisers).
export const advertiserInquiries = pgTable("advertiser_inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
