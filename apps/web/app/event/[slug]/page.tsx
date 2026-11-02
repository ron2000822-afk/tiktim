import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatHebrewDayDate, formatHebrewTime, formatPriceFrom, formatUpdatedAgo } from "@tiktim/shared";
import { genreTintVar } from "@/app/lib/genre-colors";
import { EVENT_PAGE_COPY } from "@/app/lib/copy/event";
import { Rail } from "@/app/components/Rail";
import { EventCard } from "@/app/components/EventCard";
import { SaveHeart } from "@/app/components/SaveHeart";
import { StatusBadge } from "@/app/components/StatusBadge";
import { EmptyState } from "@/app/components/EmptyState";
import { getEventByShortId, listEvents } from "@/lib/queries/events";
import { getOffersForEvent } from "@/lib/queries/offers";
import { ErrorReportForm } from "./ErrorReportForm";

export const instant = false;

function extractShortId(slugParam: string) {
  return slugParam.slice(-8);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventByShortId(extractShortId(slug));
  if (!event) return {};

  const title = `${event.artistNameHe} - ${event.venueName}, ${event.cityNameHe}`;
  const description = `${event.artistNameHe} ב${event.venueName}, ${event.cityNameHe} — ${formatHebrewDayDate(event.startsAt)}. ${EVENT_PAGE_COPY.disclaimer}`;
  const canonicalPath = `/event/${event.slug}-${event.shortId}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, type: "website" },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: slugParam } = await params;
  const shortId = extractShortId(slugParam);
  const event = await getEventByShortId(shortId);
  if (!event) notFound();

  const canonicalSlug = `${event.slug}-${event.shortId}`;
  if (slugParam !== canonicalSlug) {
    redirect(`/event/${canonicalSlug}`);
  }

  const now = new Date();
  const isPast = event.startsAt < now;

  const [offers, moreDates, similar] = await Promise.all([
    isPast ? Promise.resolve([]) : getOffersForEvent(event.id),
    listEvents({ artistSlug: event.artistSlug, excludeEventId: event.id, limit: 6 }),
    event.genreSlug
      ? listEvents({ genreSlugs: [event.genreSlug], excludeEventId: event.id, limit: 8 })
      : Promise.resolve([]),
  ]);

  const eventUrl = `https://tiktim.co.il/event/${canonicalSlug}`;
  const whatsappText = encodeURIComponent(`${event.artistNameHe} - ${event.venueName}, ${event.cityNameHe}\n${eventUrl}`);
  const wazeUrl = event.venueLat && event.venueLng ? `https://waze.com/ul?ll=${event.venueLat},${event.venueLng}&navigate=yes` : null;
  const mapsUrl =
    event.venueLat && event.venueLng
      ? `https://www.google.com/maps/search/?api=1&query=${event.venueLat},${event.venueLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName} ${event.cityNameHe}`)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.artistNameHe,
    startDate: event.startsAt.toISOString(),
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : event.status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venueName,
      address: event.cityNameHe,
      ...(event.venueLat && event.venueLng
        ? { geo: { "@type": "GeoCoordinates", latitude: event.venueLat, longitude: event.venueLng } }
        : {}),
    },
    performer: { "@type": "PerformingGroup", name: event.artistNameHe },
    offers: offers.map((o) => ({
      "@type": "Offer",
      url: `https://tiktim.co.il/go/${o.id}`,
      price: o.priceMin ?? undefined,
      priceCurrency: "ILS",
      availability:
        o.availability === "sold_out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    })),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div
        className="relative flex min-h-56 items-end rounded-[var(--radius-card)] p-6"
        style={
          event.imageUrl
            ? { backgroundImage: `url(${event.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${genreTintVar(event.genreSlug)}, var(--surface-2))` }
        }
      >
        <div className="absolute end-4 top-4">
          <SaveHeart eventShortId={event.shortId} />
        </div>
        <div className="space-y-2 text-[var(--background)]">
          <StatusBadge status={event.status} />
          <h1 className="text-3xl font-extrabold sm:text-4xl">{event.artistNameHe}</h1>
          {event.tourName && <p className="text-lg opacity-90">{event.tourName}</p>}
        </div>
      </div>

      {isPast && (
        <EmptyState title={EVENT_PAGE_COPY.pastEvent} body={EVENT_PAGE_COPY.pastEventBody} />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{formatHebrewDayDate(event.startsAt)}</p>
          <p>{formatHebrewTime(event.startsAt)}</p>
          {event.doorsAt && <p className="text-sm text-[var(--text-muted)]">{EVENT_PAGE_COPY.doorsAt(formatHebrewTime(event.doorsAt))}</p>}
        </div>
        <div className="space-y-1">
          <Link href={`/venue/${event.venueSlug}`} className="text-lg font-semibold hover:text-[var(--accent)]">
            {event.venueName}
          </Link>
          <p className="text-[var(--text-muted)]">{event.cityNameHe}</p>
          <div className="flex gap-3 text-sm">
            {wazeUrl && (
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">
                {EVENT_PAGE_COPY.waze}
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">
              {EVENT_PAGE_COPY.googleMaps}
            </a>
          </div>
        </div>
      </div>

      {event.minPrice && <p className="text-xl font-bold">{formatPriceFrom(event.minPrice)}</p>}

      {!isPast && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{EVENT_PAGE_COPY.whereToBuy}</h2>
          {offers.length === 0 ? (
            <p className="text-[var(--text-muted)]">{EVENT_PAGE_COPY.noOffers}</p>
          ) : (
            <ul className="space-y-2">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div>
                    <p className="font-semibold">{offer.sourceNameHe}</p>
                    {offer.priceMin && <p className="text-sm text-[var(--text-muted)]">{formatPriceFrom(offer.priceMin)}</p>}
                  </div>
                  <a
                    href={`/go/${offer.id}?page=/event/${canonicalSlug}`}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
                  >
                    {EVENT_PAGE_COPY.buyAt(offer.sourceNameHe)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[var(--border)] px-4 py-2 hover:border-[var(--accent)]"
        >
          {EVENT_PAGE_COPY.share}
        </a>
        <a
          href={`/event/${canonicalSlug}/ics`}
          className="rounded-full border border-[var(--border)] px-4 py-2 hover:border-[var(--accent)]"
        >
          {EVENT_PAGE_COPY.addToCalendar}
        </a>
      </div>

      {moreDates.length > 0 && (
        <Rail title={EVENT_PAGE_COPY.moreDates}>
          {moreDates.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      {similar.length > 0 && (
        <Rail title={EVENT_PAGE_COPY.similarEvents}>
          {similar.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}

      <div className="space-y-2 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)]">
        <p>{formatUpdatedAgo(event.lastSeenAt)}</p>
        <p>{EVENT_PAGE_COPY.disclaimer}</p>
        <ErrorReportForm eventId={event.id} />
      </div>
    </div>
  );
}
