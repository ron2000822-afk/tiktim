import "./load-env";
import { eq } from "drizzle-orm";
import { slugify, taxonomy } from "@tiktim/shared";
import { db } from "./client";
import {
  artistGenres,
  artists,
  categories,
  cities,
  eventArtists,
  events,
  genres,
  regions,
  sources,
  ticketOffers,
  venues,
} from "./schema";
import { BAND_NAMES, CITIES, FIRST_NAMES, INTERNATIONAL_ARTISTS, LAST_NAMES, SOURCES, VENUES } from "./seed-data";

// Deterministic PRNG (mulberry32) so re-running the seed on the same day
// produces the exact same rows — required for idempotency.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261101);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const chance = (p: number) => rng() < p;

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function shortId(index: number) {
  // Deterministic, stable per index — not just random per run.
  let n = index * 2654435761 + 20261101;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += BASE62[n % BASE62.length];
    n = Math.floor(n / BASE62.length) + i * 97;
  }
  return out;
}

async function main() {
  console.log("Seeding regions...");
  const regionRows = await db
    .insert(regions)
    .values(taxonomy.regions.map((r, i) => ({ slug: r.slug, nameHe: r.name_he, sortOrder: i })))
    .onConflictDoNothing({ target: regions.slug })
    .returning();
  const regionBySlug = new Map((regionRows.length ? regionRows : await db.select().from(regions)).map((r) => [r.slug, r]));

  console.log("Seeding categories + genres...");
  const categoryRows = await db
    .insert(categories)
    .values(
      taxonomy.categories.map((c, i) => ({ slug: c.slug, nameHe: c.name_he, isActive: c.is_active, sortOrder: i })),
    )
    .onConflictDoNothing({ target: categories.slug })
    .returning();
  const categoryBySlug = new Map(
    (categoryRows.length ? categoryRows : await db.select().from(categories)).map((c) => [c.slug, c]),
  );

  const genreSeedRows = taxonomy.categories.flatMap((c) =>
    c.genres.map((g, i) => ({
      slug: g.slug,
      categoryId: categoryBySlug.get(c.slug)!.id,
      nameHe: g.name_he,
      sortOrder: i,
    })),
  );
  const genreRows = genreSeedRows.length
    ? await db.insert(genres).values(genreSeedRows).onConflictDoNothing({ target: genres.slug }).returning()
    : [];
  const genreBySlug = new Map((genreRows.length ? genreRows : await db.select().from(genres)).map((g) => [g.slug, g]));
  const musicGenres = taxonomy.categories.find((c) => c.slug === "music")!.genres.map((g) => g.slug);
  const standupGenres = taxonomy.categories.find((c) => c.slug === "standup")!.genres.map((g) => g.slug);

  console.log("Seeding cities...");
  const cityRows = await db
    .insert(cities)
    .values(
      CITIES.map((c) => ({
        slug: c.slug,
        nameHe: c.nameHe,
        nameEn: c.nameEn,
        regionId: regionBySlug.get(c.region)!.id,
        lat: c.lat,
        lng: c.lng,
      })),
    )
    .onConflictDoNothing({ target: cities.slug })
    .returning();
  const cityBySlug = new Map((cityRows.length ? cityRows : await db.select().from(cities)).map((c) => [c.slug, c]));

  console.log("Seeding venues...");
  const venueRows = await db
    .insert(venues)
    .values(
      VENUES.map((v) => {
        const city = cityBySlug.get(v.city)!;
        return {
          slug: v.slug,
          name: v.name,
          nameNorm: slugify(v.name).replace(/-/g, " "),
          cityId: city.id,
          lat: city.lat,
          lng: city.lng,
          capacity: v.capacity,
          venueType: v.type,
          isOutdoor: v.outdoor ?? false,
        };
      }),
    )
    .onConflictDoNothing({ target: venues.slug })
    .returning();
  const venueList = venueRows.length ? venueRows : await db.select().from(venues);

  console.log("Seeding sources...");
  const sourceRows = await db
    .insert(sources)
    .values(SOURCES.map((s) => ({ slug: s.slug, nameHe: s.nameHe, kind: "manual" as const, tier: 4, isActive: true })))
    .onConflictDoNothing({ target: sources.slug })
    .returning();
  const sourceList = sourceRows.length ? sourceRows : await db.select().from(sources);

  console.log("Seeding artists...");
  type ArtistSeed = { nameHe: string; nameEn: string; isInternational: boolean; genreSlugs: string[] };
  const artistSeeds: ArtistSeed[] = [];

  for (const name of INTERNATIONAL_ARTISTS) {
    artistSeeds.push({ nameHe: name, nameEn: name, isInternational: true, genreSlugs: [pick(musicGenres)] });
  }

  const usedNames = new Set<string>();
  while (artistSeeds.length < 120) {
    const isStandup = chance(0.2);
    const isBand = !isStandup && chance(0.22);

    let nameHe: string;
    let nameEn: string;
    if (isBand) {
      const [he, en] = pick(BAND_NAMES);
      nameHe = he;
      nameEn = en;
    } else {
      const [firstHe, firstEn] = pick(FIRST_NAMES);
      const [lastHe, lastEn] = pick(LAST_NAMES);
      nameHe = `${firstHe} ${lastHe}`;
      nameEn = `${firstEn} ${lastEn}`;
    }
    if (usedNames.has(nameHe)) continue;
    usedNames.add(nameHe);

    const genreSlugs = isStandup
      ? [pick(standupGenres)]
      : chance(0.3)
        ? [pick(musicGenres), pick(musicGenres)].filter((g, i, a) => a.indexOf(g) === i)
        : [pick(musicGenres)];

    artistSeeds.push({ nameHe, nameEn, isInternational: false, genreSlugs });
  }

  const artistRows = await db
    .insert(artists)
    .values(
      artistSeeds.map((a, i) => ({
        slug: `${slugify(a.nameEn)}-${i}`,
        nameHe: a.nameHe,
        nameEn: a.nameEn,
        nameNorm: slugify(a.nameHe).replace(/-/g, " "),
        aliases: [a.nameEn],
        aliasesNorm: [slugify(a.nameEn).replace(/-/g, " ")],
        isInternational: a.isInternational,
        popularity: randInt(0, 1000),
        isVerified: true,
      })),
    )
    .onConflictDoNothing({ target: artists.slug })
    .returning();
  const artistList = artistRows.length ? artistRows : await db.select().from(artists);

  console.log("Seeding artist_genres...");
  const artistGenreRows = artistList.flatMap((artist, i) => {
    const seed = artistSeeds[i];
    if (!seed) return [];
    return seed.genreSlugs
      .map((slug) => genreBySlug.get(slug))
      .filter((g): g is NonNullable<typeof g> => Boolean(g))
      .map((genre, j) => ({ artistId: artist.id, genreId: genre.id, isPrimary: j === 0 }));
  });
  if (artistGenreRows.length) {
    await db.insert(artistGenres).values(artistGenreRows).onConflictDoNothing();
  }

  console.log("Seeding events + offers...");
  const musicCategory = categoryBySlug.get("music")!;
  const standupCategory = categoryBySlug.get("standup")!;
  const now = new Date();

  const PRICE_BY_TYPE: Record<string, [number, number]> = {
    club: [80, 180],
    hall: [150, 350],
    theater: [120, 250],
    amphitheater: [200, 450],
    arena: [250, 600],
    stadium: [300, 800],
    outdoor: [100, 300],
    bar: [50, 120],
    other: [100, 250],
  };

  const eventSeeds = Array.from({ length: 250 }, (_, i) => {
    const isStandup = chance(0.18);
    const category = isStandup ? standupCategory : musicCategory;
    const eligibleArtists = artistList.filter((_, idx) => {
      const seed = artistSeeds[idx];
      if (!seed) return false;
      const wantsStandup = seed.genreSlugs.some((g) => standupGenres.includes(g));
      return isStandup ? wantsStandup : !wantsStandup;
    });
    const artist = pick(eligibleArtists.length ? eligibleArtists : artistList);
    const venue = pick(venueList);
    const daysOut = randInt(1, 120);
    const startsAt = new Date(now.getTime() + daysOut * 24 * 60 * 60 * 1000);
    startsAt.setHours(pick([19, 20, 20, 21]), pick([0, 0, 30]), 0, 0);

    const statusRoll = rng();
    const status = statusRoll < 0.85 ? "scheduled" : statusRoll < 0.92 ? "few_left" : statusRoll < 0.97 ? "sold_out" : "postponed";

    const [priceLow, priceHigh] = PRICE_BY_TYPE[venue.venueType] ?? PRICE_BY_TYPE.other;
    const basePrice = randInt(priceLow, priceHigh);

    const tags: string[] = [];
    if (venue.isOutdoor) tags.push("outdoor");
    const artistSeed = artistSeeds[artistList.indexOf(artist)];
    if (artistSeed?.isInternational) tags.push("international", "english");
    if (chance(0.04)) tags.push("free");
    if (chance(0.03)) tags.push("festival");
    if (chance(0.15)) tags.push("accessible");

    return {
      index: i,
      artist,
      venue,
      category,
      startsAt,
      status: status as "scheduled" | "few_left" | "sold_out" | "postponed",
      basePrice,
      tags,
    };
  });

  for (const seed of eventSeeds) {
    const titleSuffix = seed.tags.includes("festival") ? " - פסטיבל" : "";
    const [event] = await db
      .insert(events)
      .values({
        slug: slugify(seed.artist.nameHe) || slugify(seed.artist.nameEn ?? seed.artist.nameHe),
        shortId: shortId(seed.index),
        title: `${seed.artist.nameHe}${titleSuffix}`,
        categoryId: seed.category.id,
        venueId: seed.venue.id,
        startsAt: seed.startsAt,
        status: seed.status,
        currency: "ILS",
        tags: seed.tags,
        confidence: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        publishedAt: now,
      })
      .onConflictDoNothing({ target: events.shortId })
      .returning();
    if (!event) continue;

    await db
      .insert(eventArtists)
      .values({ eventId: event.id, artistId: seed.artist.id, role: "headliner", billingOrder: 0 })
      .onConflictDoNothing();

    const offerCount = randInt(1, 3);
    const chosenSources = [...sourceList].sort(() => rng() - 0.5).slice(0, offerCount);
    const offerRows = chosenSources.map((source) => {
      const variance = randInt(-10, 15);
      const priceMin = Math.max(20, seed.basePrice + variance);
      const priceMax = priceMin + randInt(0, 80);
      const availability =
        seed.status === "sold_out" ? "sold_out" : seed.status === "few_left" ? "few_left" : "available";
      return {
        eventId: event.id,
        sourceId: source.id,
        externalId: `${event.shortId}-${source.slug}`,
        url: `https://example-sellers.test/${source.slug}/${event.shortId}`,
        priceMin: String(priceMin),
        priceMax: String(priceMax),
        availability: availability as "available" | "few_left" | "sold_out",
        lastCheckedAt: now,
        lastSeenAt: now,
      };
    });
    if (offerRows.length) {
      await db.insert(ticketOffers).values(offerRows).onConflictDoNothing();
      const minPrice = Math.min(...offerRows.map((o) => Number(o.priceMin)));
      const maxPrice = Math.max(...offerRows.map((o) => Number(o.priceMax)));
      await db
        .update(events)
        .set({ minPrice: String(minPrice), maxPrice: String(maxPrice) })
        .where(eq(events.id, event.id));
    }
  }

  console.log("Seed complete.");
  console.log(
    `regions=${regionRows.length || regionBySlug.size} cities=${cityRows.length} venues=${venueRows.length} artists=${artistRows.length} events≈${eventSeeds.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
