import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { VENUE_PAGE_COPY } from "@/app/lib/copy/profile";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { getVenueBySlug } from "@/lib/queries/venues";
import { listEvents } from "@/lib/queries/events";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return {};
  return { title: `${venue.name}, ${venue.cityNameHe}`, alternates: { canonical: `/venue/${slug}` } };
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const events = await listEvents({ venueSlug: slug, limit: 24 });

  const wazeUrl =
    venue.lat && venue.lng ? `https://waze.com/ul?ll=${venue.lat},${venue.lng}&navigate=yes` : null;
  const mapsUrl =
    venue.lat && venue.lng
      ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.cityNameHe}`)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold">{venue.name}</h1>
        <p className="text-[var(--text-muted)]">
          {venue.cityNameHe}
          {venue.address ? ` · ${venue.address}` : ""}
        </p>
        {venue.capacity && <p className="text-sm text-[var(--text-muted)]">{VENUE_PAGE_COPY.capacity(venue.capacity)}</p>}
        <div className="flex gap-3 text-sm">
          {wazeUrl && (
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">
              {VENUE_PAGE_COPY.waze}
            </a>
          )}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">
            {VENUE_PAGE_COPY.googleMaps}
          </a>
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">
              {venue.website}
            </a>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{VENUE_PAGE_COPY.upcomingEvents}</h2>
        <EventListingGrid events={events} emptyTitle={VENUE_PAGE_COPY.noUpcoming} emptyBody={LISTING_COPY.emptyBody} />
      </section>
    </div>
  );
}
