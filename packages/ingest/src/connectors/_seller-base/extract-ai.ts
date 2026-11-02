import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { z } from "zod";

const extractedListingSchema = z.object({
  title: z.string(),
  artistNames: z.array(z.string()),
  venueName: z.string(),
  cityName: z.string().optional(),
  startsAt: z.string(),
  categoryHint: z.enum(["music", "standup", "other"]).optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
});

export type AiExtractedListing = z.infer<typeof extractedListingSchema>;

// Content-hash cache so an unchanged page is never re-sent to the model
// within the same process run, per docs/INGESTION.md's Tier 3 section.
const cache = new Map<string, AiExtractedListing | null>();

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Last-resort extraction when a Tier 3 page has no structured data (no
 * JSON-LD, no embedded JSON state) and no site-specific selector matched.
 * Returns null (never throws) without ANTHROPIC_API_KEY, on a malformed
 * response, or on any API error — callers treat null as "could not extract",
 * routing the item to review_queue rather than failing the whole run.
 */
export async function extractListingWithAI(cleanedText: string, sourceUrl: string): Promise<AiExtractedListing | null> {
  const key = hashContent(cleanedText);
  if (cache.has(key)) return cache.get(key) ?? null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const truncated = cleanedText.slice(0, 24000); // ~6k tokens

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract event details from this Israeli ticket-seller page (${sourceUrl}). Content:

${truncated}

Respond with ONLY a JSON object, no other text, matching this shape:
{"title": "...", "artistNames": ["..."], "venueName": "...", "cityName": "...", "startsAt": "ISO 8601 datetime", "categoryHint": "music" | "standup" | "other", "priceMin": number, "priceMax": number}
Omit fields you cannot determine. If this page is not a single ticketed event, respond with {}.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      cache.set(key, null);
      return null;
    }

    const parsed = extractedListingSchema.safeParse(JSON.parse(textBlock.text));
    const result = parsed.success ? parsed.data : null;
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
