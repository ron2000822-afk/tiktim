import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allGenres } from "@tiktim/shared";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";
import { listCities } from "@/lib/queries/venues";

export const instant = false;

async function resolve(genreSlug: string, citySlug: string) {
  const genre = allGenres.find((g) => g.slug === genreSlug);
  const cities = await listCities();
  const city = cities.find((c) => c.slug === citySlug);
  return { genre, city };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string; city: string }>;
}): Promise<Metadata> {
  const { genre: genreSlug, city: citySlug } = await params;
  const { genre, city } = await resolve(genreSlug, citySlug);
  if (!genre || !city) return {};

  const events = await listEvents({ genreSlugs: [genreSlug], citySlug, limit: 3 });
  return {
    title: LISTING_COPY.genreInCityTitle(genre.name_he, city.nameHe),
    alternates: { canonical: `/music/${genreSlug}/${citySlug}` },
    robots: events.length < 3 ? { index: false } : undefined,
  };
}

export default async function GenreCityPage({
  params,
}: {
  params: Promise<{ genre: string; city: string }>;
}) {
  const { genre: genreSlug, city: citySlug } = await params;
  const { genre, city } = await resolve(genreSlug, citySlug);
  if (!genre || !city) notFound();

  const events = await listEvents({ genreSlugs: [genreSlug], citySlug, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{LISTING_COPY.genreInCityTitle(genre.name_he, city.nameHe)}</h1>
      <Link
        href={`/search?genre=${genreSlug}&city=${citySlug}&weekday=4,5,6`}
        className="inline-block rounded-full border border-[var(--accent)] px-3 py-1 text-sm text-[var(--accent)]"
      >
        {LISTING_COPY.weekendOnly}
      </Link>
      <EventListingGrid events={events} emptyTitle={LISTING_COPY.emptyTitle} emptyBody={LISTING_COPY.emptyBody} />
    </div>
  );
}
