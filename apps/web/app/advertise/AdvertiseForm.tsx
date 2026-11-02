"use client";

import { useActionState } from "react";
import { ADVERTISE_COPY } from "@/app/lib/copy/legal";
import { submitAdvertiserInquiry } from "./actions";

async function action(_prevState: { ok: boolean }, formData: FormData) {
  return submitAdvertiserInquiry(formData);
}

export function AdvertiseForm() {
  const [state, formAction, pending] = useActionState(action, { ok: false });

  if (state.ok) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--status-new)]">
        {ADVERTISE_COPY.thanks}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="advertise-name" className="mb-1 block text-sm font-medium">
          {ADVERTISE_COPY.nameLabel}
        </label>
        <input
          id="advertise-name"
          name="name"
          type="text"
          required
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="advertise-email" className="mb-1 block text-sm font-medium">
          {ADVERTISE_COPY.emailLabel}
        </label>
        <input
          id="advertise-email"
          name="email"
          type="email"
          required
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="advertise-message" className="mb-1 block text-sm font-medium">
          {ADVERTISE_COPY.messageLabel}
        </label>
        <textarea
          id="advertise-message"
          name="message"
          required
          rows={4}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {ADVERTISE_COPY.submit}
      </button>
    </form>
  );
}
