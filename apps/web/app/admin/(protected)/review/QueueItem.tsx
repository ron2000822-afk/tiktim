"use client";

import { useTransition } from "react";
import {
  approveArtistImageSuggestion,
  approveGenreSuggestion,
  approveSubmission,
  approveUnverifiedArtist,
  keepEventsSeparate,
  publishLowConfidenceEvent,
  rejectReviewEntry,
  resolvePossibleDuplicate,
} from "./actions";

type ReviewRow = {
  id: string;
  kind: string;
  payload: unknown;
  createdAt: Date;
  relatedArtistId: string | null;
  relatedEventId: string | null;
};

const KIND_LABELS: Record<string, string> = {
  possible_duplicate: "כפילות אפשרית",
  unmatched_artist: "אמן לא מזוהה",
  unmatched_venue: "אולם לא מזוהה",
  genre_suggestion: "הצעת ז'אנר",
  submission: "הצעת מופע ממפיק",
  error_report: "דיווח שגיאה",
  low_confidence_event: "הופעה בביטחון נמוך",
  artist_image_suggestion: "הצעת תמונה לאמן",
};

export function QueueItem({ row }: { row: ReviewRow }) {
  const [pending, startTransition] = useTransition();
  const payload = row.payload as Record<string, unknown>;

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold">
          {KIND_LABELS[row.kind] ?? row.kind}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(row.createdAt)}
        </span>
      </div>

      {row.kind === "artist_image_suggestion" && typeof payload.imageUrl === "string" ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of an arbitrary external Commons URL, not a site asset */}
          <img
            src={payload.imageUrl}
            alt=""
            className="h-24 w-24 rounded-[var(--radius-button)] border border-[var(--border)] object-cover"
          />
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-[var(--text-muted)]">אמן: </span>
              <span className="font-semibold">{String(payload.artistName ?? "—")}</span>
            </p>
            <p className="text-[var(--text-muted)]">
              נמצא בעמוד ויקיפדיה: <span dir="ltr">{String(payload.matchedTitle ?? "—")}</span>
            </p>
            <p className="text-[var(--text-muted)]">
              קרדיט: {String(payload.imageCredit ?? "—")} ({String(payload.imageLicense ?? "—")})
            </p>
          </div>
        </div>
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-[var(--text-muted)]" dir="ltr">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {row.kind === "unmatched_artist" && row.relatedArtistId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveUnverifiedArtist(row.id, row.relatedArtistId!))}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
          >
            אשר כאמן חדש
          </button>
        )}

        {row.kind === "possible_duplicate" && row.relatedEventId && typeof payload.existingEventId === "string" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resolvePossibleDuplicate(row.id, payload.existingEventId as string, row.relatedEventId!))}
              className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
            >
              מזג להופעה הקיימת
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => keepEventsSeparate(row.id))}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
            >
              השאר נפרדות
            </button>
          </>
        )}

        {row.kind === "genre_suggestion" && row.relatedArtistId && Array.isArray(payload.genreSlugs) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveGenreSuggestion(row.id, row.relatedArtistId!, payload.genreSlugs as string[]))}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
          >
            אשר ז&apos;אנר ({(payload.genreSlugs as string[]).join(", ")})
          </button>
        )}

        {row.kind === "submission" && (
          typeof payload.url === "string" && payload.url ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveSubmission(row.id, payload as Record<string, string>))}
              className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
            >
              אשר והמר להופעה
            </button>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              לא נמסר קישור לכרטיסים — יש להוסיף את ההופעה ידנית דרך &quot;הוספת הופעה&quot; לאחר אימות עם המפיק.
            </p>
          )
        )}

        {row.kind === "low_confidence_event" && row.relatedEventId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishLowConfidenceEvent(row.id, row.relatedEventId!))}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
          >
            פרסם הופעה
          </button>
        )}

        {row.kind === "artist_image_suggestion" &&
          row.relatedArtistId &&
          typeof payload.imageUrl === "string" &&
          typeof payload.imageCredit === "string" &&
          typeof payload.imageLicense === "string" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  approveArtistImageSuggestion(row.id, row.relatedArtistId!, {
                    imageUrl: payload.imageUrl as string,
                    imageCredit: payload.imageCredit as string,
                    imageLicense: payload.imageLicense as string,
                  }),
                )
              }
              className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
            >
              אשר תמונה
            </button>
          )}

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => rejectReviewEntry(row.id))}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]"
        >
          דחה / סגור
        </button>
      </div>
    </div>
  );
}
