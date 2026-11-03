"use client";

import { useState } from "react";
import { updateNotificationPrefs } from "@/app/lib/actions/me";
import { ME_COPY } from "@/app/lib/copy/me";

type Frequency = "instant" | "daily" | "weekly" | "off";

const FREQUENCIES: Frequency[] = ["instant", "daily", "weekly", "off"];

export function NotificationPrefsForm({
  initialAlertsFrequency,
  initialNewsletterFrequency,
}: {
  initialAlertsFrequency: Frequency;
  initialNewsletterFrequency: Frequency;
}) {
  const [alertsFrequency, setAlertsFrequency] = useState<Frequency>(initialAlertsFrequency);
  const [newsletterFrequency, setNewsletterFrequency] = useState<Frequency>(initialNewsletterFrequency);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateNotificationPrefs({ alertsFrequency, newsletterFrequency });
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="alerts-frequency" className="mb-1 block text-sm font-medium">
          {ME_COPY.alertsLabel}
        </label>
        <select
          id="alerts-frequency"
          value={alertsFrequency}
          onChange={(e) => setAlertsFrequency(e.target.value as Frequency)}
          className="w-full max-w-xs rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {ME_COPY.frequency[f]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="newsletter-frequency" className="mb-1 block text-sm font-medium">
          {ME_COPY.newsletterLabel}
        </label>
        <select
          id="newsletter-frequency"
          value={newsletterFrequency}
          onChange={(e) => setNewsletterFrequency(e.target.value as Frequency)}
          className="w-full max-w-xs rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          {["weekly", "off"].map((f) => (
            <option key={f} value={f}>
              {ME_COPY.frequency[f as Frequency]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
      >
        {saved ? ME_COPY.saved : ME_COPY.save}
      </button>
    </form>
  );
}
