"use client";

import { useActionState, useState } from "react";
import { createPromotion } from "../actions";
import { ADMIN_COPY } from "../../../copy";

type EventOption = {
  id: string;
  title: string;
  venueName: string;
  cityNameHe: string;
  startsAt: Date;
};

type GenreOption = { slug: string; name_he: string };

async function submit(_prev: unknown, formData: FormData) {
  const result = await createPromotion(formData);
  return result;
}

export function PromotionForm({ event, genres }: { event: EventOption; genres: GenreOption[] }) {
  const [state, formAction, pending] = useActionState(submit, null);
  const [slot, setSlot] = useState<"hero" | "genre_rail_top" | "newsletter">("hero");
  const copy = ADMIN_COPY.promotions.form;

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <p className="text-sm text-[var(--text-muted)]">{copy.selectedEvent}</p>
        <p className="font-semibold">{event.title}</p>
        <p className="text-sm text-[var(--text-muted)]">
          {event.venueName}, {event.cityNameHe} · {new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(event.startsAt)}
        </p>
      </div>

      <div>
        <label htmlFor="slot" className="mb-1 block text-sm font-medium">
          {copy.slotLabel}
        </label>
        <select
          id="slot"
          name="slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value as typeof slot)}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="hero">{ADMIN_COPY.promotions.slotLabels.hero}</option>
          <option value="genre_rail_top">{ADMIN_COPY.promotions.slotLabels.genre_rail_top}</option>
          <option value="newsletter">{ADMIN_COPY.promotions.slotLabels.newsletter}</option>
        </select>
      </div>

      {slot === "genre_rail_top" && (
        <div>
          <label htmlFor="genreSlug" className="mb-1 block text-sm font-medium">
            {copy.genreLabel}
          </label>
          <select
            id="genreSlug"
            name="genreSlug"
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name_he}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">
            {copy.startsAtLabel}
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="endsAt" className="mb-1 block text-sm font-medium">
            {copy.endsAtLabel}
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="advertiser" className="mb-1 block text-sm font-medium">
          {copy.advertiserLabel}
        </label>
        <input
          id="advertiser"
          name="advertiser"
          required
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium">
            {copy.priceLabel}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium">
            {copy.notesLabel}
          </label>
          <input
            id="notes"
            name="notes"
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {copy.submit}
      </button>

      {state?.ok === true && <p className="text-sm text-[var(--status-new)]">{copy.success}</p>}
      {state?.ok === false && (
        <p className="text-sm text-[var(--status-cancelled)]">{state.error === "genreRequired" ? copy.genreRequiredError : state.error}</p>
      )}
    </form>
  );
}
