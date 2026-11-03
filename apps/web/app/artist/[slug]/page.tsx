import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { Rail } from "@/app/components/Rail";
import { EventCard } from "@/app/components/EventCard";
import { EmptyState } from "@/app/components/EmptyState";
import { ARTIST_PAGE_COPY } from "@/app/lib/copy/profile";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { getArtistBySlug } from "@/lib/queries/artists";
import { listEvents, listPastEventsByArtist } from "@/lib/queries/events";
import { FollowButton } from "@/app/components/FollowButton";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return {};
  return {
    title: artist.nameHe,
    description: artist.bioShort ?? `כל התאריכים הקרובים של ${artist.nameHe} בישראל.`,
    alternates: { canonical: `/artist/${slug}` },
  };
}

export const instant = false;

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const [upcoming, past] = await Promise.all([
    listEvents({ artistSlug: slug, limit: 24 }),
    listPastEventsByArtist(slug, 8),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold">{artist.nameHe}</h1>
          <FollowButton targetType="artist" targetId={artist.id} />
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-[var(--text-muted)]">
          <span>{ARTIST_PAGE_COPY.followers(artist.followerCount)}</span>
          {artist.isInternational && <span>· {ARTIST_PAGE_COPY.international}</span>}
          {artist.genres.map((g) => (
            <span key={g.slug}>· {g.nameHe}</span>
          ))}
        </div>
        {artist.bioShort && <p className="max-w-2xl text-[var(--text-muted)]">{artist.bioShort}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{ARTIST_PAGE_COPY.upcomingDates}</h2>
        {upcoming.length === 0 ? (
          <EmptyState title={ARTIST_PAGE_COPY.noUpcoming} />
        ) : (
          <EventListingGrid events={upcoming} emptyTitle={LISTING_COPY.emptyTitle} />
        )}
      </section>

      {past.length > 0 && (
        <Rail title={ARTIST_PAGE_COPY.pastDates}>
          {past.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      )}
    </div>
  );
}
