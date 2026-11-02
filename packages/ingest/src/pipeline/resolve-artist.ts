import { sql } from "drizzle-orm";
import { normalizeHe, slugify } from "@tiktim/shared";
import { db } from "@tiktim/db";
import { artists } from "@tiktim/db/schema";
import { decideArtistMatch, type ArtistMatchDecision } from "./match-artist";

async function findArtistCandidates(nameNorm: string): Promise<{ id: string; score: number }[]> {
  const exact = await db
    .select({ id: artists.id })
    .from(artists)
    .where(sql`${artists.nameNorm} = ${nameNorm} or ${nameNorm} = any(${artists.aliasesNorm})`)
    .limit(1);

  if (exact.length > 0) {
    return [{ id: exact[0].id, score: 1.0 }];
  }

  const fuzzy = await db.execute<{ id: string; score: number }>(sql`
    select id, greatest(
      similarity(name_norm, ${nameNorm}),
      coalesce((select max(similarity(alias, ${nameNorm})) from unnest(aliases_norm) alias), 0)
    ) as score
    from artists
    where name_norm % ${nameNorm}
       or exists (select 1 from unnest(aliases_norm) alias where alias % ${nameNorm})
    order by score desc
    limit 5
  `);

  return fuzzy.map((row) => ({ id: row.id, score: Number(row.score) }));
}

export async function resolveArtist(rawName: string): Promise<ArtistMatchDecision> {
  const nameNorm = normalizeHe(rawName);
  const candidates = await findArtistCandidates(nameNorm);
  return decideArtistMatch(candidates);
}

export async function createUnverifiedArtist(rawName: string): Promise<string> {
  const nameNorm = normalizeHe(rawName);
  const baseSlug = slugify(rawName) || "artist";
  const [created] = await db
    .insert(artists)
    .values({
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      nameHe: rawName,
      nameNorm,
      isVerified: false,
    })
    .returning({ id: artists.id });
  return created.id;
}
