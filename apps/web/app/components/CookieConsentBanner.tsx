"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_COPY } from "@/app/lib/copy/consent";
import { readConsentCookie, writeConsentCookie } from "@/app/lib/consent";
import { initPostHog } from "@/app/lib/posthog-client";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reads a cookie (unavailable during SSR) after mount — avoids a
    // server/client hydration mismatch, same pattern as SaveHeart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readConsentCookie() === null);
  }, []);

  function respond(granted: boolean) {
    writeConsentCookie(granted ? "granted" : "declined");
    if (granted) initPostHog();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={CONSENT_COPY.message}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--text)]">
          {CONSENT_COPY.message}{" "}
          <Link href="/privacy" className="underline">
            {CONSENT_COPY.privacyLink}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm"
          >
            {CONSENT_COPY.decline}
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
          >
            {CONSENT_COPY.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
