"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatHebrewDayDate, formatPriceFrom } from "@tiktim/shared";
import { genreTintVar } from "@/app/lib/genre-colors";
import { EVENT_CARD_COPY } from "@/app/lib/copy/site";
import type { EventCardData } from "@/lib/queries/events";

const AUTO_ADVANCE_MS = 6000;

export function HeroCarousel({ events }: { events: EventCardData[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <Link
        href={href}
        className="relative flex min-h-64 items-end p-6 sm:min-h-80 sm:p-10"
        style={{ background: `linear-gradient(135deg, ${genreTintVar(event.genreSlug)}, var(--surface-2))` }}
      >
        <div className="max-w-xl space-y-2 text-[var(--background)]">
          <h2 className="text-3xl font-extrabold sm:text-5xl">{event.artistNameHe}</h2>
          <p className="text-lg opacity-90">{formatHebrewDayDate(event.startsAt)}</p>
          <p className="opacity-90">
            {event.cityNameHe} · {event.venueName}
          </p>
          <p className="text-xl font-bold">{formatPriceFrom(event.minPrice) ?? EVENT_CARD_COPY.priceFallback}</p>
        </div>
      </Link>

      {events.length > 1 && (
        <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-2">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`הופעה ${i + 1} מתוך ${events.length}`}
              aria-current={i === index}
              className="h-2 w-2 rounded-full bg-[var(--background)]"
              style={{ opacity: i === index ? 1 : 0.4 }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
