type JsonLdNode = Record<string, unknown>;

const EVENT_TYPES = new Set(["Event", "MusicEvent", "ComedyEvent", "TheaterEvent", "Festival", "SocialEvent"]);

function isEventNode(node: unknown): node is JsonLdNode {
  if (typeof node !== "object" || node === null) return false;
  const type = (node as JsonLdNode)["@type"];
  if (typeof type === "string") return EVENT_TYPES.has(type);
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && EVENT_TYPES.has(t));
  return false;
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

/** Extracts every schema.org Event-like node from all `<script type="application/ld+json">` blocks in `html`. */
export function extractEventJsonLd(html: string): JsonLdNode[] {
  const events: JsonLdNode[] = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    try {
      const parsed = JSON.parse(match[1]);
      events.push(...flattenGraph(parsed).filter(isEventNode));
    } catch {
      // Malformed JSON-LD on the page — skip this block, not the whole page.
    }
  }
  return events;
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
