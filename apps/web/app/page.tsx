import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { daysAgo, getThisWeekRange, getWeekendRange, taxonomy } from "@tiktim/shared";
import { EventCard } from "@/app/components/EventCard";
import { Rail } from "@/app/components/Rail";
import { QuickChips } from "@/app/components/QuickChips";
import { HeroCarousel } from "@/app/components/HeroCarousel";
import { CitiesGrid } from "@/app/components/CitiesGrid";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { EmptyState } from "@/app/components/EmptyState";
import { HOME_COPY } from "@/app/lib/copy/home";
import { listEvents } from "@/lib/queries/events";
import { listCities } from "@/lib/queries/venues";
import { getActiveGenreRailPromotions, getActiveHeroPromotion } from "@/lib/queries/promotions";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function HomeContent() {
  "use cache";
  cacheLife("hours");
  cacheTag("events");

  const weekRange = getThisWeekRange();
  const sevenDaysAgo = daysAgo(7);
  const musicGenres = taxonomy.categories.find((c) => c.slug === "music")?.genres ?? [];
  const weekendRange = getWeekendRange();

  const [hero, hotNow, weekend, freshListings, international, lastTickets, cities, genreRailsRaw, standup, heroPromotion, genreRailPromotions] =
    await Promise.all([
      listEvents({ featuredOnly: true, limit: 6 }),
      listEvents({ sort: "popularity", limit: 12 }),
      listEvents({ dateStart: weekendRange.start, dateEnd: weekendRange.end, limit: 12 }),
      listEvents({ limit: 60 }).then((rows) =>
        rows
          .filter((e) => e.firstSeenAt >= sevenDaysAgo)
          .sort((a, b) => b.firstSeenAt.getTime() - a.firstSeenAt.getTime())
          .slice(0, 12),
      ),
      listEvents({ limit: 12 }).then((rows) => rows.filter((e) => e.tags.includes("international"))),
      (async () => {
        const rows = await listEvents({ dateEnd: weekRange.end, limit: 50 });
        return rows.filter((e) => e.status === "few_left").slice(0, 12);
      })(),
      listCities(),
      Promise.all(musicGenres.map((g) => listEvents({ genreSlugs: [g.slug], limit: 10 }).then((rows) => ({ genre: g, rows })))),
      listEvents({ categorySlug: "standup", limit: 12 }),
      getActiveHeroPromotion(),
      getActiveGenreRailPromotions(),
    ]);

  const heroEventsBase = hero.length > 0 ? hero : await listEvents({ sort: "popularity", limit: 6 });
  // A sponsored placement is inserted on top of the organic hero rotation,
  // never replacing it — per CLAUDE.md, promotions must never alter organic
  // ranking, only add a clearly labeled slot.
  const heroEvents = heroPromotion
    ? [heroPromotion, ...heroEventsBase.filter((e) => e.id !== heroPromotion.id)]
    : heroEventsBase;

  // The >=3 threshold is about organic content quality, not about whether a
  // paid placement renders — an advertiser who bought a genre-rail slot
  // should see it live regardless of how many organic events that genre has.
  const genreRails = genreRailsRaw
    .filter(({ genre, rows }) => rows.length >= 3 || genreRailPromotions.has(genre.slug))
    .map(({ genre, rows }) => {
      const promoted = genreRailPromotions.get(genre.slug);
      if (!promoted) return { genre, rows, promotedEventId: undefined as string | undefined };
      return { genre, rows: [promoted, ...rows.filter((e) => e.id !== promoted.id)], promotedEventId: promoted.id };
    });
  const citiesWithEvents = cities.slice(0, 20);

  const nothingAtAll = heroEvents.length === 0 && hotNow.length === 0;

  if (nothingAtAll) {
    return <EmptyState title={HOME_COPY.emptyTitle} body={HOME_COPY.emptyBody} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      {heroEvents.length > 0 && <HeroCarousel events={heroEvents} sponsoredEventId={heroPromotion?.id} />}

      <QuickChips />

      {hotNow.length > 0 && (
        <Rail title={HOME_COPY.hotNow}>
          {hotNow.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {weekend.length > 0 && (
        <Rail title={HOME_COPY.weekendRail} href="/weekend">
          {weekend.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {freshListings.length > 0 && (
        <Rail title={HOME_COPY.newListings}>
          {freshListings.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {genreRails.map(({ genre, rows, promotedEventId }) => (
        <Rail key={genre.slug} title={genre.name_he} href={`/music/${genre.slug}`}>
          {rows.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" sponsored={e.id === promotedEventId} />
          ))}
        </Rail>
      ))}

      {standup.length > 0 && (
        <Rail title={HOME_COPY.standup} href="/standup">
          {standup.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {international.length > 0 && (
        <Rail title={HOME_COPY.international}>
          {international.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {lastTickets.length > 0 && (
        <Rail title={HOME_COPY.lastTickets}>
          {lastTickets.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {citiesWithEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{HOME_COPY.citiesTitle}</h2>
          <CitiesGrid cities={citiesWithEvents} />
        </section>
      )}

      <NewsletterSignup />
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
