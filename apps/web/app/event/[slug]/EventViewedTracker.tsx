"use client";

import { useEffect } from "react";
import { capture } from "@/app/lib/posthog-client";

export function EventViewedTracker({ eventId, eventSlug, categorySlug }: { eventId: string; eventSlug: string; categorySlug: string }) {
  useEffect(() => {
    capture("event_viewed", { eventId, eventSlug, categorySlug });
  }, [eventId, eventSlug, categorySlug]);

  return null;
}
