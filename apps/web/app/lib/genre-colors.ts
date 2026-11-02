const KNOWN_GENRE_SLUGS = new Set([
  "rock",
  "pop",
  "mizrahit",
  "hiphop",
  "indie",
  "electronic",
  "jazz",
  "soul",
  "metal",
  "nostalgia",
  "jewish",
  "folk",
  "world",
  "classical",
  "tribute",
  "standup",
  "solo",
  "lineup",
  "open-mic",
]);

export function genreTintVar(genreSlug: string | null | undefined): string {
  if (genreSlug && KNOWN_GENRE_SLUGS.has(genreSlug)) return `var(--genre-${genreSlug})`;
  return "var(--accent)";
}
