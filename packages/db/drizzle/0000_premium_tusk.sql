CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."artist_role" AS ENUM('headliner', 'support', 'lineup');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('available', 'few_left', 'sold_out', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."email_frequency" AS ENUM('instant', 'daily', 'weekly', 'off');--> statement-breakpoint
CREATE TYPE "public"."error_report_kind" AS ENUM('wrong_date', 'wrong_price', 'cancelled', 'wrong_venue', 'other');--> statement-breakpoint
CREATE TYPE "public"."error_report_status" AS ENUM('open', 'fixed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'few_left', 'sold_out', 'postponed', 'cancelled', 'unavailable', 'past');--> statement-breakpoint
CREATE TYPE "public"."follow_target" AS ENUM('artist', 'genre', 'city', 'venue');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('new_show', 'reminder_7d', 'reminder_1d', 'status_change', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."promo_slot" AS ENUM('hero', 'genre_rail_top', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."raw_listing_parse_status" AS ENUM('ok', 'error', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."review_kind" AS ENUM('possible_duplicate', 'unmatched_artist', 'unmatched_venue', 'genre_suggestion', 'submission', 'error_report', 'low_confidence_event');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('open', 'approved', 'rejected', 'merged');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('api', 'feed', 'scrape', 'manual', 'submission');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('club', 'hall', 'theater', 'amphitheater', 'arena', 'stadium', 'outdoor', 'bar', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_genres" (
	"artist_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "artist_genres_artist_id_genre_id_pk" PRIMARY KEY("artist_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"name_en" text,
	"name_norm" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"aliases_norm" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_international" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"image_credit" text,
	"image_license" text,
	"bio_short" text,
	"popularity" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- auth.users is managed entirely by Supabase Auth; it already exists and our
-- connection role doesn't have CREATE on the auth schema. We only declared it
-- in schema.ts so other tables can reference auth.users(id) as a foreign key.
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"name_en" text,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"region_id" uuid NOT NULL,
	"lat" real,
	"lng" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"user_id" uuid,
	"genres" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"region_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"newsletter_frequency" "email_frequency" DEFAULT 'weekly' NOT NULL,
	"alerts_frequency" "email_frequency" DEFAULT 'instant' NOT NULL,
	"confirm_token" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"consent_source" text,
	"consent_at" timestamp with time zone,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_subscriptions_email_unique" UNIQUE("email"),
	CONSTRAINT "email_subscriptions_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "error_report_kind" NOT NULL,
	"message" text,
	"contact_email" text,
	"status" "error_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_artists" (
	"event_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"role" "artist_role" DEFAULT 'headliner' NOT NULL,
	"billing_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "event_artists_event_id_artist_id_pk" PRIMARY KEY("event_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"short_id" text NOT NULL,
	"title" text NOT NULL,
	"tour_name" text,
	"category_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"doors_at" timestamp with time zone,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"currency" text DEFAULT 'ILS' NOT NULL,
	"image_url" text,
	"image_credit" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"genre_override" uuid[],
	"confidence" real DEFAULT 1 NOT NULL,
	"hot_score" real DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follows" (
	"user_id" uuid NOT NULL,
	"target_type" "follow_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_target_type_target_id_pk" PRIMARY KEY("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name_he" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingestion_run_status" DEFAULT 'running' NOT NULL,
	"fetched" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"merged" integer DEFAULT 0 NOT NULL,
	"queued" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"error_sample" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"event_id" uuid,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_id" text,
	CONSTRAINT "notifications_log_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbound_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"user_id" uuid,
	"page" text NOT NULL,
	"referrer" text,
	"utm" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"home_region_id" uuid,
	"onboarded_at" timestamp with time zone,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"slot" "promo_slot" NOT NULL,
	"genre_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"advertiser" text NOT NULL,
	"price" numeric(10, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"run_id" uuid,
	"parse_status" "raw_listing_parse_status" DEFAULT 'ok' NOT NULL,
	"parse_error" text,
	"matched_event_id" uuid,
	CONSTRAINT "raw_listings_source_external_id_key" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "review_kind" NOT NULL,
	"status" "review_status" DEFAULT 'open' NOT NULL,
	"payload" jsonb NOT NULL,
	"confidence" real,
	"related_event_id" uuid,
	"related_artist_id" uuid,
	"created_by" text DEFAULT 'pipeline' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_events" (
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_events_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"tier" smallint NOT NULL,
	"base_url" text,
	"affiliate_program" text,
	"affiliate_config" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"schedule_cron" text,
	"legal_approved_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"affiliate_url" text,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"availability" "availability" DEFAULT 'unknown' NOT NULL,
	"missed_runs" integer DEFAULT 0 NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_offers_source_external_id_key" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_norm" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"aliases_norm" text[] DEFAULT '{}'::text[] NOT NULL,
	"city_id" uuid NOT NULL,
	"address" text,
	"lat" real,
	"lng" real,
	"capacity" integer,
	"venue_type" "venue_type" DEFAULT 'other' NOT NULL,
	"is_outdoor" boolean DEFAULT false NOT NULL,
	"accessibility_notes" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_reports" ADD CONSTRAINT "error_reports_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "genres" ADD CONSTRAINT "genres_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_offer_id_ticket_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."ticket_offers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_home_region_id_regions_id_fk" FOREIGN KEY ("home_region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_matched_event_id_events_id_fk" FOREIGN KEY ("matched_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_related_artist_id_artists_id_fk" FOREIGN KEY ("related_artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_offers" ADD CONSTRAINT "ticket_offers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_offers" ADD CONSTRAINT "ticket_offers_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artists_name_norm_trgm_idx" ON "artists" USING gin ("name_norm" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artists_aliases_norm_idx" ON "artists" USING gin ("aliases_norm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_venue_starts_at_idx" ON "events" USING btree ("venue_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_category_starts_at_idx" ON "events" USING btree ("category_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_status_starts_at_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_tags_idx" ON "events" USING gin ("tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_clicks_created_at_idx" ON "outbound_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_clicks_source_created_at_idx" ON "outbound_clicks" USING btree ("source_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venues_name_norm_trgm_idx" ON "venues" USING gin ("name_norm" gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles" FOR INSERT WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" FOR UPDATE USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "profiles_delete_own" ON "profiles" FOR DELETE USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "follows_select_own" ON "follows" FOR SELECT USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "follows_insert_own" ON "follows" FOR INSERT WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "follows_delete_own" ON "follows" FOR DELETE USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "saved_events_select_own" ON "saved_events" FOR SELECT USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "saved_events_insert_own" ON "saved_events" FOR INSERT WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "saved_events_delete_own" ON "saved_events" FOR DELETE USING (auth.uid() = user_id);--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'regions', 'cities', 'categories', 'genres', 'artists', 'venues', 'events',
    'sources', 'ticket_offers', 'review_queue', 'profiles', 'email_subscriptions', 'promotions'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;