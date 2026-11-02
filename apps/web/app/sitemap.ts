import type { MetadataRoute } from "next";
import { listAllArtistSlugs } from "@/lib/queries/artists";
import { listIndexableGenreCityCombos, listIndexableGenreSlugs, listAllPublishedEventRefs } from "@/lib/queries/events";
import { listAllVenueSlugs, listCities } from "@/lib/queries/venues";

const STATIC_PATHS = ["/", "/music", "/standup", "/today", "/weekend", "/this-week", "/about", "/terms", "/privacy", "/accessibility", "/advertise"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  const [events, artists, venues, cities, musicGenreSlugs, genreCityCombos] = await Promise.all([
    listAllPublishedEventRefs(),
    listAllArtistSlugs(),
    listAllVenueSlugs(),
    listCities(),
    listIndexableGenreSlugs(),
    listIndexableGenreCityCombos(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PATHS.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "daily" as const, priority: path === "/" ? 1 : 0.7 })),
    ...events.map((e) => ({
      url: `${siteUrl}/event/${e.slug}-${e.shortId}`,
      lastModified: e.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...artists.map((a) => ({ url: `${siteUrl}/artist/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...venues.map((v) => ({ url: `${siteUrl}/venue/${v.slug}`, lastModified: v.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...cities.map((c) => ({ url: `${siteUrl}/city/${c.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...musicGenreSlugs.map((slug) => ({ url: `${siteUrl}/music/${slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...genreCityCombos.map((combo) => ({
      url: `${siteUrl}/music/${combo.genreSlug}/${combo.citySlug}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];

  return entries;
}
