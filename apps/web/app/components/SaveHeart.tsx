"use client";

import { useEffect, useState } from "react";
import { EVENT_CARD_COPY } from "@/app/lib/copy/site";
import { capture } from "@/app/lib/posthog-client";

const STORAGE_KEY = "tiktim:savedEvents";

function readSavedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently.
  }
}

export function SaveHeart({ eventShortId }: { eventShortId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Reads localStorage (unavailable during SSR) after mount — the
    // intentional pattern to avoid a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSavedIds().includes(eventShortId));
  }, [eventShortId]);

  function toggle() {
    const ids = readSavedIds();
    const next = saved ? ids.filter((id) => id !== eventShortId) : [...ids, eventShortId];
    writeSavedIds(next);
    setSaved(!saved);
    capture(saved ? "event_unsaved" : "event_saved", { eventShortId });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? EVENT_CARD_COPY.unsave : EVENT_CARD_COPY.save}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background)]/70 text-lg"
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
    </button>
  );
}
