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

async function HomeContent() {
  "use cache";
  cacheLife("hours");
  cacheTag("events");

  const weekRange = getThisWeekRange();
  const sevenDaysAgo = daysAgo(7);
  const musicGenres = taxonomy.categories.find((c) => c.slug === "music")?.genres ?? [];
  const weekendRange = getWeekendRange();

  const [hero, hotNow, weekend, freshListings, international, lastTickets, cities, genreRailsRaw, standup] =
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
    ]);

  const heroEvents = hero.length > 0 ? hero : await listEvents({ sort: "popularity", limit: 6 });
  const genreRails = genreRailsRaw.filter(({ rows }) => rows.length >= 3);
  const citiesWithEvents = cities.slice(0, 20);

  const nothingAtAll = heroEvents.length === 0 && hotNow.length === 0;

  if (nothingAtAll) {
    return <EmptyState title={HOME_COPY.emptyTitle} body={HOME_COPY.emptyBody} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      {heroEvents.length > 0 && <HeroCarousel events={heroEvents} />}

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

      {genreRails.map(({ genre, rows }) => (
        <Rail key={genre.slug} title={genre.name_he} href={`/music/${genre.slug}`}>
          {rows.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
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
