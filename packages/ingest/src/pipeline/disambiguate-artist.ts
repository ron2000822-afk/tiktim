import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@tiktim/db";
import { artists } from "@tiktim/db/schema";
import { inArray } from "drizzle-orm";
import type { ArtistCandidateScore } from "./match-artist";

const responseSchema = z.object({ pick: z.string().nullable() });

/**
 * Asks the model to pick among up to 5 ambiguous artist candidates, or
 * "none". Returns null (never throws) when ANTHROPIC_API_KEY isn't set, the
 * call fails, or the model says "none" — the caller always queues the
 * result for admin review regardless (see docs/INGESTION.md: "accept only
 * with admin review queued. Never auto-merge two existing artist records").
 */
export async function disambiguateArtist(rawName: string, candidates: ArtistCandidateScore[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || candidates.length === 0) return null;

  const top5 = candidates.slice(0, 5);
  const rows = await db
    .select({ id: artists.id, nameHe: artists.nameHe, nameEn: artists.nameEn })
    .from(artists)
    .where(inArray(artists.id, top5.map((c) => c.id)));

  if (rows.length === 0) return null;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `A ticket listing names an artist as "${rawName}". Which of these existing artist records (if any) is the same artist?
${rows.map((r) => `- id: ${r.id}, name: ${r.nameHe}${r.nameEn ? ` (${r.nameEn})` : ""}`).join("\n")}

Respond with ONLY JSON: {"pick": "<id>"} or {"pick": null} if none of them are a confident match.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = responseSchema.safeParse(JSON.parse(textBlock.text));
    if (!parsed.success || !parsed.data.pick) return null;

    return rows.some((r) => r.id === parsed.data.pick) ? parsed.data.pick : null;
  } catch {
    return null;
  }
}
