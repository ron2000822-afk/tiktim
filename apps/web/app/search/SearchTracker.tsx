"use client";

import { useEffect } from "react";
import { capture } from "@/app/lib/posthog-client";

export function SearchTracker({ filters, resultCount }: { filters: Record<string, unknown>; resultCount: number }) {
  useEffect(() => {
    capture("search_performed", { ...filters, resultCount });
    // Only re-fire when the filter values (or result count) actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), resultCount]);

  return null;
}
