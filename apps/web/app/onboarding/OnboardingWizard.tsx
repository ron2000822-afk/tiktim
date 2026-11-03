"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_COPY } from "@/app/lib/copy/onboarding";
import { completeOnboarding, skipOnboarding } from "@/app/lib/actions/onboarding";

type Genre = { id: string; nameHe: string; categoryNameHe: string };
type Region = { id: string; slug: string; nameHe: string };
type Artist = { id: string; nameHe: string };

const TOTAL_STEPS = 3;

export function OnboardingWizard({
  genres,
  regions,
  artists,
  next,
}: {
  genres: Genre[];
  regions: Region[];
  artists: Artist[];
  next: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [genreIds, setGenreIds] = useState<Set<string>>(new Set());
  const [regionId, setRegionId] = useState<string | null>(null);
  const [artistIds, setArtistIds] = useState<Set<string>>(new Set());
  const [artistFilter, setArtistFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredArtists = useMemo(() => {
    const q = artistFilter.trim();
    if (!q) return artists.slice(0, 30);
    return artists.filter((a) => a.nameHe.includes(q));
  }, [artists, artistFilter]);

  function toggleSet(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleFinish() {
    setSubmitting(true);
    await completeOnboarding({
      genreIds: Array.from(genreIds),
      regionId,
      artistIds: Array.from(artistIds),
    });
    router.push(next);
  }

  async function handleSkip() {
    setSubmitting(true);
    await skipOnboarding();
    router.push(next);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-muted)]">{ONBOARDING_COPY.stepLabel(step, TOTAL_STEPS)}</p>

      {step === 1 && (
        <fieldset className="space-y-4">
          <div>
            <legend className="text-xl font-bold">{ONBOARDING_COPY.genres.title}</legend>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{ONBOARDING_COPY.genres.body}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <label
                key={g.id}
                className={
                  genreIds.has(g.id)
                    ? "cursor-pointer rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--background)]"
                    : "cursor-pointer rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                }
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={genreIds.has(g.id)}
                  onChange={() => toggleSet(genreIds, g.id, setGenreIds)}
                />
                {g.nameHe}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="space-y-4">
          <div>
            <legend className="text-xl font-bold">{ONBOARDING_COPY.region.title}</legend>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{ONBOARDING_COPY.region.body}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <label
                key={r.id}
                className={
                  regionId === r.id
                    ? "cursor-pointer rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--background)]"
                    : "cursor-pointer rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                }
              >
                <input
                  type="radio"
                  name="region"
                  className="sr-only"
                  checked={regionId === r.id}
                  onChange={() => setRegionId(r.id)}
                />
                {r.nameHe}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="space-y-4">
          <div>
            <legend className="text-xl font-bold">{ONBOARDING_COPY.artists.title}</legend>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{ONBOARDING_COPY.artists.body}</p>
          </div>
          <label className="sr-only" htmlFor="onboarding-artist-search">
            {ONBOARDING_COPY.artists.searchPlaceholder}
          </label>
          <input
            id="onboarding-artist-search"
            type="search"
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            placeholder={ONBOARDING_COPY.artists.searchPlaceholder}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {filteredArtists.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{ONBOARDING_COPY.artists.noResults}</p>
            ) : (
              filteredArtists.map((a) => (
                <label
                  key={a.id}
                  className={
                    artistIds.has(a.id)
                      ? "cursor-pointer rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--background)]"
                      : "cursor-pointer rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                  }
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={artistIds.has(a.id)}
                    onChange={() => toggleSet(artistIds, a.id, setArtistIds)}
                  />
                  {a.nameHe}
                </label>
              ))
            )}
          </div>
        </fieldset>
      )}

      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={handleSkip} disabled={submitting} className="text-sm text-[var(--text-muted)] underline">
          {ONBOARDING_COPY.skip}
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
              className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm font-semibold"
            >
              {ONBOARDING_COPY.back}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={submitting}
              className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
            >
              {ONBOARDING_COPY.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
            >
              {ONBOARDING_COPY.finish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
