"use client";

import { useEffect, useState } from "react";
import { EVENT_CARD_COPY } from "@/app/lib/copy/site";
import { capture } from "@/app/lib/posthog-client";
import { useCurrentUser } from "@/app/lib/use-current-user";
import { readLocalSavedIds, writeLocalSavedIds } from "@/app/lib/local-saves";
import { getSavedStatus, toggleSave } from "@/app/lib/actions/saved-events";
import { useLazyActive } from "@/app/lib/use-lazy-active";

export function SaveHeart({ eventShortId }: { eventShortId: string }) {
  const { ref, active } = useLazyActive<HTMLButtonElement>();
  const { user, loading } = useCurrentUser();
  const [saved, setSaved] = useState(false);

  // The home page alone renders 60-100+ of these across all its rails —
  // without `active`, every single one runs its status-check effect (and
  // the resulting re-render) on initial mount, which is real, measured
  // main-thread cost. Gating on visibility means only the handful actually
  // on screen do that work up front; the rest catch up right before the
  // user scrolls to them.
  useEffect(() => {
    if (!active || loading) return;
    if (user) {
      getSavedStatus(eventShortId).then(setSaved);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(readLocalSavedIds().includes(eventShortId));
    }
  }, [active, eventShortId, user, loading]);

  async function toggle() {
    if (user) {
      const result = await toggleSave(eventShortId);
      if ("saved" in result) {
        setSaved(result.saved);
        capture(result.saved ? "event_saved" : "event_unsaved", { eventShortId });
      }
      return;
    }

    const ids = readLocalSavedIds();
    const next = saved ? ids.filter((id) => id !== eventShortId) : [...ids, eventShortId];
    writeLocalSavedIds(next);
    setSaved(!saved);
    capture(saved ? "event_unsaved" : "event_saved", { eventShortId });
  }

  return (
    <button
      ref={ref}
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
