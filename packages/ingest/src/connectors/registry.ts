import type { Connector } from "./types";
import { ticketmasterConnector } from "./ticketmaster";
import { leaanConnector } from "./leaan";
import { grayclubConnector } from "./grayclub";
import { comyConnector } from "./comy";
import { zappaConnector } from "./zappa";
import { eventimConnector } from "./eventim";

// Tier 3 connectors default to sources.is_active = false on creation (see
// ensureSource in pipeline/run.ts) and runPipeline skips inactive sources —
// per docs/INGESTION.md, Tier 3 only runs in production once the owner sets
// legal_approved_at. An admin can flip a source active from /admin/ingestion
// for local/staging testing in the meantime.
export const connectors: Connector[] = [
  ticketmasterConnector,
  leaanConnector,
  grayclubConnector,
  comyConnector,
  zappaConnector,
  eventimConnector,
];

export function getConnector(slug: string): Connector | undefined {
  return connectors.find((c) => c.slug === slug);
}
