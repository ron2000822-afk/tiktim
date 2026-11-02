"use client";

import { useActionState } from "react";
import { ADD_SHOW_COPY } from "@/app/lib/copy/add-show";
import { submitShow } from "./actions";

type ActionState = { ok: boolean; error?: string };

async function action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return submitShow(formData);
}

export function AddShowForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { ok: false });

  if (state.ok) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--status-new)]">
        {ADD_SHOW_COPY.thanks}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="artistName" className="mb-1 block text-sm font-medium">
          {ADD_SHOW_COPY.artistNameLabel}
        </label>
        <input id="artistName" name="artistName" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="venueName" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.venueNameLabel}
          </label>
          <input id="venueName" name="venueName" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="cityName" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.cityNameLabel}
          </label>
          <input id="cityName" name="cityName" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.startsAtLabel}
          </label>
          <input id="startsAt" name="startsAt" type="datetime-local" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="categoryHint" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.categoryLabel}
          </label>
          <select id="categoryHint" name="categoryHint" className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <option value="music">{ADD_SHOW_COPY.categoryMusic}</option>
            <option value="standup">{ADD_SHOW_COPY.categoryStandup}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">
          {ADD_SHOW_COPY.urlLabel}
        </label>
        <input id="url" name="url" type="url" className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contactName" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.contactNameLabel}
          </label>
          <input id="contactName" name="contactName" className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium">
            {ADD_SHOW_COPY.contactEmailLabel}
          </label>
          <input id="contactEmail" name="contactEmail" type="email" required className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          {ADD_SHOW_COPY.notesLabel}
        </label>
        <textarea id="notes" name="notes" rows={3} className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {ADD_SHOW_COPY.submit}
      </button>

      {state.ok === false && state.error && <p className="text-[var(--status-cancelled)]">{state.error}</p>}
    </form>
  );
}
