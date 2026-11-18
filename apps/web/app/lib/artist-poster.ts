import { isKnownGenre } from "./genre-colors";

/**
 * Most acts have no photo we're allowed to show: Wikimedia simply has no
 * portrait for the typical local club act or stand-up comedian, and seller
 * artwork is off-limits unless the source licenses it (CLAUDE.md, Data
 * rules). Rather than render those as an obviously-missing image, each gets
 * a generated poster.
 *
 * The hue is derived from the artist's name so a given artist always looks
 * the same across the site and neighbouring cards in a rail never collide,
 * which is what made the old single-tint fallback read as broken: genre is
 * the only thing that varied it, and genre is itself usually absent.
 */
function hueFromName(name: string): number {
  // FNV-1a — tiny, stable, and well spread for short strings. Must stay
  // deterministic across server renders, so nothing random or time-based.
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 360;
}

export type PosterStyle = {
  background: string;
  /** Large watermark initial sitting behind the name. */
  initial: string;
};

export function artistPosterStyle(artistName: string, genreSlug?: string | null): PosterStyle {
  const name = artistName.trim();
  const hue = hueFromName(name || "?");

  // Two stops a fixed distance apart keeps every poster recognisably part of
  // one family while still being individually distinct. Saturation and
  // lightness stay low so white text clears WCAG AA on every hue.
  const from = `hsl(${hue} 55% 26%)`;
  const to = `hsl(${(hue + 38) % 360} 48% 14%)`;

  // A known genre still gets to tint the poster — it carries real meaning
  // when we have it, and this keeps the generated art consistent with the
  // genre colours used elsewhere once classification is running.
  const background = isKnownGenre(genreSlug)
    ? `linear-gradient(155deg, ${from}, var(--genre-${genreSlug}) 190%)`
    : `linear-gradient(155deg, ${from}, ${to})`;

  return { background, initial: Array.from(name)[0] ?? "ט" };
}
