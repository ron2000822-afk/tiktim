import Link from "next/link";
import { formatHebrewDayDate, formatPriceFrom } from "@tiktim/shared";
import { genreTintVar } from "@/app/lib/genre-colors";
import { EVENT_CARD_COPY } from "@/app/lib/copy/site";
import type { EventCardData } from "@/lib/queries/events";
import { SaveHeart } from "./SaveHeart";
import { StatusBadge } from "./StatusBadge";

export function EventCard({
  event,
  variant = "grid",
  sponsored = false,
}: {
  event: EventCardData;
  variant?: "grid" | "rail";
  sponsored?: boolean;
}) {
  const href = `/event/${event.slug}-${event.shortId}`;
  const priceLabel = formatPriceFrom(event.minPrice) ?? EVENT_CARD_COPY.priceFallback;
  // Not every seller gives an event its own photo — fall back to the
  // artist's Wikimedia Commons photo (see packages/ingest's
  // find-artist-image.ts), which needs its own credit line per Commons'
  // license terms, unlike a seller-provided event photo.
  const displayImageUrl = event.imageUrl ?? event.artistImageUrl;
  const isArtistFallbackImage = !event.imageUrl && !!event.artistImageUrl;

  return (
    <article className={`relative ${variant === "rail" ? "w-56 shrink-0 snap-start sm:w-64" : ""}`}>
      <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between">
        {sponsored ? (
          <span className="rounded-full bg-[var(--surface)]/90 px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
            {EVENT_CARD_COPY.sponsored}
          </span>
        ) : (
          <StatusBadge status={event.status} />
        )}
        <SaveHeart eventShortId={event.shortId} />
      </div>
      <Link
        href={href}
        className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
      >
        <div
          className="relative flex aspect-[4/5] items-end p-3"
          style={
            displayImageUrl
              ? { backgroundImage: `url(${displayImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: `linear-gradient(160deg, ${genreTintVar(event.genreSlug)}, var(--surface-2))` }
          }
        >
          {!displayImageUrl && (
            <span className="text-2xl font-extrabold leading-tight text-[var(--background)]/90">
              {event.artistNameHe}
            </span>
          )}
          {isArtistFallbackImage && event.artistImageCredit && (
            <span className="absolute bottom-1 start-1 rounded bg-black/50 px-1 text-[10px] text-[var(--background)]">
              {EVENT_CARD_COPY.photoCredit(event.artistImageCredit)}
            </span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="truncate font-bold group-hover:text-[var(--accent)]">{event.artistNameHe}</h3>
          <p className="text-sm text-[var(--text-muted)]">{formatHebrewDayDate(event.startsAt)}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">
            {event.cityNameHe} · {event.venueName}
          </p>
          <p className="font-semibold">{priceLabel}</p>
        </div>
      </Link>
    </article>
  );
}
