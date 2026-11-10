type JsonLdNode = Record<string, unknown>;

const EVENT_TYPES = new Set(["Event", "MusicEvent", "ComedyEvent", "TheaterEvent", "Festival", "SocialEvent"]);
const SERIES_TYPES = new Set(["EventSeries"]);

function hasType(node: JsonLdNode, types: Set<string>): boolean {
  const type = node["@type"];
  if (typeof type === "string") return types.has(type);
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && types.has(t));
  return false;
}

function isEventNode(node: unknown): node is JsonLdNode {
  return typeof node === "object" && node !== null && hasType(node as JsonLdNode, EVENT_TYPES);
}

function isSeriesNode(node: unknown): node is JsonLdNode {
  return typeof node === "object" && node !== null && hasType(node as JsonLdNode, SERIES_TYPES);
}

function flattenGraph(parsed: unknown): JsonLdNode[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenGraph);
  if (typeof parsed === "object" && parsed !== null) {
    const node = parsed as JsonLdNode;
    if (Array.isArray(node["@graph"])) return (node["@graph"] as unknown[]).flatMap(flattenGraph);
    return [node];
  }
  return [];
}

/**
 * An `EventSeries` (e.g. an artist's "all upcoming shows" page — confirmed
 * live on zappa-club.co.il) embeds each actual performance as a plain Event
 * node in its `subEvent` field rather than listing the series itself as a
 * bookable item — each subEvent is pulled out as its own listing.
 */
function expandEventSeries(nodes: JsonLdNode[]): JsonLdNode[] {
  const expanded: JsonLdNode[] = [];
  for (const node of nodes) {
    if (isEventNode(node)) expanded.push(node);
    if (isSeriesNode(node)) {
      const subEvents = Array.isArray(node.subEvent) ? (node.subEvent as unknown[]) : node.subEvent ? [node.subEvent] : [];
      expanded.push(...subEvents.filter(isEventNode));
    }
  }
  return expanded;
}

/** Extracts every schema.org Event-like node (including EventSeries subEvents) from all `<script type="application/ld+json">` blocks in `html`. */
export function extractEventJsonLd(html: string): JsonLdNode[] {
  const allNodes: JsonLdNode[] = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    try {
      const parsed = JSON.parse(match[1]);
      allNodes.push(...flattenGraph(parsed));
    } catch {
      // Malformed JSON-LD on the page — skip this block, not the whole page.
    }
  }
  return expandEventSeries(allNodes);
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/** Maps a schema.org Event-like node to the fields NormalizedListing can use directly. */
export function mapJsonLdEventToListingFields(event: JsonLdNode) {
  const location = event.location as JsonLdNode | undefined;
  const address = location?.address as JsonLdNode | undefined;
  const geo = address?.geo as JsonLdNode | undefined;
  const performers = Array.isArray(event.performer) ? (event.performer as JsonLdNode[]) : event.performer ? [event.performer as JsonLdNode] : [];

  return {
    title: firstString(event.name),
    startsAt: firstString(event.startDate),
    venueName: firstString(location?.name),
    cityName: firstString(address?.addressLocality),
    address: firstString(address?.streetAddress),
    lat: typeof geo?.latitude === "number" ? geo.latitude : undefined,
    lng: typeof geo?.longitude === "number" ? geo.longitude : undefined,
    artistNames: performers.map((p) => firstString(p.name)).filter((n): n is string => Boolean(n)),
    status: mapEventStatus(firstString(event.eventStatus)),
    imageUrl: firstString(event.image),
  };
}

function mapEventStatus(schemaStatus: string | undefined): "scheduled" | "postponed" | "cancelled" | undefined {
  if (!schemaStatus) return undefined;
  if (schemaStatus.endsWith("EventCancelled")) return "cancelled";
  if (schemaStatus.endsWith("EventPostponed") || schemaStatus.endsWith("EventRescheduled")) return "postponed";
  if (schemaStatus.endsWith("EventScheduled")) return "scheduled";
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asNodeArray(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value as JsonLdNode[];
  if (value && typeof value === "object") return [value as JsonLdNode];
  return [];
}

/**
 * Extracts a price range from a schema.org Event's `offers`, which may be a
 * single Offer, an AggregateOffer (lowPrice/highPrice), or an array of
 * either — ticket sites commonly list one Offer per price tier. Some
 * platforms (Eventim-powered sites: Zappa, Eventim Israel) nest the actual
 * priced Offer two levels down, inside an AggregateOffer's
 * `itemOffered.offers` — confirmed live on zappa-club.co.il — so each
 * offer is also checked for a nested itemOffered before giving up on it.
 */
export function extractPriceRange(event: JsonLdNode): { min: number; max: number; currency?: string } | null {
  const offers = asNodeArray(event.offers);
  if (offers.length === 0) return null;

  const prices: number[] = [];
  let currency: string | undefined;

  const collectFrom = (offer: JsonLdNode) => {
    const low = toNumber(offer.lowPrice);
    const high = toNumber(offer.highPrice);
    const single = toNumber(offer.price);
    if (low !== undefined) prices.push(low);
    if (high !== undefined) prices.push(high);
    if (low === undefined && high === undefined && single !== undefined) prices.push(single);
    currency ??= firstString(offer.priceCurrency);
  };

  for (const offer of offers) {
    collectFrom(offer);
    const itemOffered = asNodeArray(offer.itemOffered);
    for (const item of itemOffered) {
      for (const nested of asNodeArray(item.offers)) collectFrom(nested);
    }
  }

  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices), currency };
}
