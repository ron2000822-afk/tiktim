import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";
import { listCities } from "@/lib/queries/venues";

async function resolveCity(citySlug: string) {
  const cities = await listCities();
  return cities.find((c) => c.slug === citySlug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await resolveCity(citySlug);
  if (!city) return {};
  return { title: LISTING_COPY.cityTitle(city.nameHe), alternates: { canonical: `/city/${citySlug}` } };
}

export const instant = false;

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  await connection();
  const { city: citySlug } = await params;
  const city = await resolveCity(citySlug);
  if (!city) notFound();

  const events = await listEvents({ citySlug, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{LISTING_COPY.cityTitle(city.nameHe)}</h1>
      <EventListingGrid events={events} emptyTitle={LISTING_COPY.emptyTitle} emptyBody={LISTING_COPY.emptyBody} />
    </div>
  );
}
