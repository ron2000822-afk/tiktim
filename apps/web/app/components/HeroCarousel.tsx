"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { formatHebrewDayDate, formatPriceFrom } from "@tiktim/shared";
import { genreTintVar } from "@/app/lib/genre-colors";
import { EVENT_CARD_COPY, HERO_CAROUSEL_COPY } from "@/app/lib/copy/site";
import type { EventCardData } from "@/lib/queries/events";

const AUTO_ADVANCE_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;

export function HeroCarousel({ events, sponsoredEventId }: { events: EventCardData[]; sponsoredEventId?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || prefersReducedMotion || events.length <= 1) return;

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % events.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, events.length]);

  if (events.length === 0) return null;
  const event = events[index];
  const href = `/event/${event.slug}-${event.shortId}`;
  // Not every seller gives an event its own photo — fall back to the
  // artist's Wikimedia Commons photo, which needs its own credit line.
  const displayImageUrl = event.imageUrl ?? event.artistImageUrl;
  const isArtistFallbackImage = !event.imageUrl && !!event.artistImageUrl;

  function goTo(next: number) {
    setIndex(((next % events.length) + events.length) % events.length);
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (events.length <= 1) return;
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    setPaused(true);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (dragStartX.current === null) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  }

  function handlePointerUp() {
    if (dragStartX.current === null) return;
    const delta = dragDeltaX.current;
    dragStartX.current = null;
    // Swipe left (finger moves right-to-left) advances, matching the "next"
    // button sitting on the left (the logical end side in RTL).
    if (delta < -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (delta > SWIPE_THRESHOLD_PX) goTo(index - 1);
    setPaused(false);
  }

  function handleLinkClickCapture(e: React.MouseEvent) {
    // A drag that moved enough to count as a swipe shouldn't also fire the
    // card's own navigation click.
    if (Math.abs(dragDeltaX.current) > 10) {
      e.preventDefault();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (events.length <= 1) return;
    // Mirrored for RTL: left arrow moves toward the next slide (visually
    // further left), right arrow moves back toward the previous one.
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      aria-roledescription="carousel"
    >
      <Link
        href={href}
        onClickCapture={handleLinkClickCapture}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex min-h-64 touch-pan-y items-end p-6 select-none sm:min-h-80 sm:p-10"
        style={
          displayImageUrl
            ? { backgroundImage: `url(${displayImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${genreTintVar(event.genreSlug)}, var(--surface-2))` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden="true" />
        <div className="relative max-w-xl space-y-2 pe-10 text-[var(--text)]">
          {event.id === sponsoredEventId && (
            <span className="inline-block rounded-full bg-[var(--surface)]/90 px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
              {EVENT_CARD_COPY.sponsored}
            </span>
          )}
          <h2 className="text-3xl font-extrabold drop-shadow-sm sm:text-5xl">{event.artistNameHe}</h2>
          <p className="text-lg opacity-90">{formatHebrewDayDate(event.startsAt)}</p>
          <p className="opacity-90">
            {event.cityNameHe} · {event.venueName}
          </p>
          <p className="text-xl font-bold">{formatPriceFrom(event.minPrice) ?? EVENT_CARD_COPY.priceFallback}</p>
        </div>
        {isArtistFallbackImage && event.artistImageCredit && (
          <span className="absolute bottom-2 start-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-[var(--text)]">
            {EVENT_CARD_COPY.photoCredit(event.artistImageCredit)}
          </span>
        )}
      </Link>

      {events.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={HERO_CAROUSEL_COPY.previous}
            className="absolute start-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-lg text-[var(--text)] transition-colors hover:bg-black/60"
          >
            <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={HERO_CAROUSEL_COPY.next}
            className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-lg text-[var(--text)] transition-colors hover:bg-black/60"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-1">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={HERO_CAROUSEL_COPY.goToSlide(i + 1, events.length)}
                aria-current={i === index}
                className="flex h-5 w-5 items-center justify-center"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--text)]" style={{ opacity: i === index ? 1 : 0.4 }} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
