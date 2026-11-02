import type { Connector } from "./types";

/**
 * Not pulled by the CLI — admin's "add event" form and the producer
 * submission flow call `processListing` directly with a listing they
 * already have in hand. This object exists so there's a `sources` row
 * (kind=manual, tier=4) for `ticket_offers.source_id` to point at, and so
 * other code can reason about "the manual source" uniformly.
 */
export const manualConnector: Connector = {
  slug: "manual",
  tier: 4,
  async *fetch() {
    // Intentionally empty: manual entries are pushed via processListing(),
    // not pulled in a batch run.
  },
  normalize() {
    return null;
  },
};
