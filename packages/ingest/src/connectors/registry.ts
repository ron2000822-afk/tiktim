import type { Connector } from "./types";
import { ticketmasterConnector } from "./ticketmaster";

export const connectors: Connector[] = [ticketmasterConnector];

export function getConnector(slug: string): Connector | undefined {
  return connectors.find((c) => c.slug === slug);
}
