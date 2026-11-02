import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { allGenres } from "@tiktim/shared";

const responseSchema = z.object({
  genreSlugs: z.array(z.string()).max(2),
});

/**
 * Suggests up to 2 genre slugs for a new artist with no genres yet, using a
 * small/cheap Claude model. Returns null (never throws) when ANTHROPIC_API_KEY
 * isn't set or the call fails — callers treat a null result as "no
 * suggestion", not an error. Results are always a *suggestion* queued for
 * admin review, never applied automatically. See docs/INGESTION.md step 9
 * and CLAUDE.md's "AI classification" rule.
 */
export async function suggestGenres(artistName: string, categorySlug: "music" | "standup"): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const candidateGenres =
    categorySlug === "standup"
      ? allGenres.filter((g) => g.categorySlug === "standup")
      : allGenres.filter((g) => g.categorySlug === "music");

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You classify Israeli performers into genres for a ticketing site. Given the artist name "${artistName}", pick up to 2 genre slugs from this list that best fit: ${candidateGenres.map((g) => `${g.slug} (${g.name_he})`).join(", ")}.

Respond with ONLY a JSON object matching this shape, no other text: {"genreSlugs": ["slug1", "slug2"]}
If you're not confident, return {"genreSlugs": []}.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = responseSchema.safeParse(JSON.parse(textBlock.text));
    if (!parsed.success) return null;

    const validSlugs = new Set(candidateGenres.map((g) => g.slug));
    const filtered = parsed.data.genreSlugs.filter((slug) => validSlugs.has(slug));
    return filtered.length > 0 ? filtered : null;
  } catch {
    return null;
  }
}
