/**
 * Pulls the OpenGraph image a seller page advertises for itself.
 *
 * Every Tier-3 seller we read already fetches the event page HTML, so this
 * costs no extra request. og:image is the image the seller chose to
 * represent the event, which makes it the right one to show — and unlike
 * scraping <img> tags it never picks up site chrome (logos, icons, tracking
 * pixels), which is exactly what a naive img-tag scrape returns on these
 * WordPress themes.
 *
 * Returns absolute https URLs only; a protocol-relative or relative og:image
 * is resolved against the page URL.
 */
export function extractOgImage(html: string, pageUrl: string): string | undefined {
  // Attribute order varies between themes, so match either arrangement.
  const match =
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  const raw = match?.[1]?.trim();
  if (!raw) return undefined;

  let resolved: URL;
  try {
    resolved = new URL(raw, pageUrl);
  } catch {
    return undefined;
  }
  if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return undefined;
  resolved.protocol = "https:";
  return resolved.toString();
}
