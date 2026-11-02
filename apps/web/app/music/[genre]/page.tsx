import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allGenres } from "@tiktim/shared";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";
import { listCities } from "@/lib/queries/venues";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }): Promise<Metadata> {
  const { genre: genreSlug } = await params;
  const genre = allGenres.find((g) => g.slug === genreSlug);
  if (!genre) return {};

  const events = await listEvents({ genreSlugs: [genreSlug], limit: 3 });
  return {
    title: genre.name_he,
    alternates: { canonical: `/music/${genreSlug}` },
    robots: events.length < 3 ? { index: false } : undefined,
  };
}

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre: genreSlug } = await params;
  const genre = allGenres.find((g) => g.slug === genreSlug);
  if (!genre) notFound();

  const [events, cities] = await Promise.all([listEvents({ genreSlugs: [genreSlug], limit: 48 }), listCities()]);
  const citySlugsWithEvents = new Set(events.map((e) => e.citySlug));
  const citiesWithEvents = cities.filter((c) => citySlugsWithEvents.has(c.slug));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{genre.name_he}</h1>
      <nav className="flex flex-wrap gap-2">
        <Link
          href={`/search?genre=${genreSlug}&weekday=4,5,6`}
          className="rounded-full border border-[var(--accent)] px-3 py-1 text-sm text-[var(--accent)]"
        >
          {LISTING_COPY.weekendOnly}
        </Link>
        {citiesWithEvents.map((city) => (
          <Link
            key={city.slug}
            href={`/music/${genreSlug}/${city.slug}`}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-sm hover:border-[var(--accent)]"
          >
            {LISTING_COPY.inCity(city.nameHe)}
          </Link>
        ))}
      </nav>
      <EventListingGrid events={events} emptyTitle={LISTING_COPY.emptyTitle} emptyBody={LISTING_COPY.emptyBody} />
    </div>
  );
}
