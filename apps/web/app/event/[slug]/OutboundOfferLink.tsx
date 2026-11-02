"use client";

import { capture } from "@/app/lib/posthog-client";

export function OutboundOfferLink({
  href,
  offerId,
  sourceNameHe,
  eventSlug,
  label,
}: {
  href: string;
  offerId: string;
  sourceNameHe: string;
  eventSlug: string;
  label: string;
}) {
  return (
    <a
      href={href}
      onClick={() => capture("outbound_click", { offerId, sourceNameHe, eventSlug })}
      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
    >
      {label}
    </a>
  );
}
