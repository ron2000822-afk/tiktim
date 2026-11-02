"use client";

import { useActionState } from "react";
import { ADMIN_COPY } from "../../../copy";
import { addManualEvent } from "./actions";

type ActionState = { ok: boolean; error?: string; outcome?: string };

async function action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return addManualEvent(formData);
}

export function AddEventForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { ok: false });
  const copy = ADMIN_COPY.addEvent;

  const successMessage =
    state.outcome === "merged" ? copy.successMerged : state.outcome === "queued_only" ? copy.successQueued : copy.successCreated;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="artistNames" className="mb-1 block text-sm font-medium">
          {copy.artistNamesLabel}
        </label>
        <input id="artistNames" name="artistNames" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="venueName" className="mb-1 block text-sm font-medium">
            {copy.venueNameLabel}
          </label>
          <input id="venueName" name="venueName" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="cityName" className="mb-1 block text-sm font-medium">
            {copy.cityNameLabel}
          </label>
          <input id="cityName" name="cityName" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">
            {copy.startsAtLabel}
          </label>
          <input id="startsAt" name="startsAt" type="datetime-local" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="categoryHint" className="mb-1 block text-sm font-medium">
            {copy.categoryLabel}
          </label>
          <select id="categoryHint" name="categoryHint" className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <option value="music">{copy.categoryMusic}</option>
            <option value="standup">{copy.categoryStandup}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">
          {copy.urlLabel}
        </label>
        <input id="url" name="url" type="url" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priceMin" className="mb-1 block text-sm font-medium">
            {copy.priceMinLabel}
          </label>
          <input id="priceMin" name="priceMin" type="number" min={0} className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="priceMax" className="mb-1 block text-sm font-medium">
            {copy.priceMaxLabel}
          </label>
          <input id="priceMax" name="priceMax" type="number" min={0} className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {copy.submit}
      </button>

      {state.ok && <p className="text-[var(--status-new)]">{successMessage}</p>}
      {state.ok === false && state.error && <p className="text-[var(--status-cancelled)]">{state.error}</p>}
    </form>
  );
}
