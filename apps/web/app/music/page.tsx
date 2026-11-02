import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { taxonomy } from "@tiktim/shared";
import { Rail } from "@/app/components/Rail";
import { EventCard } from "@/app/components/EventCard";
import { EmptyState } from "@/app/components/EmptyState";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";

export const metadata: Metadata = {
  title: LISTING_COPY.musicTitle,
};

async function MusicContent() {
  "use cache";
  cacheLife("hours");

  const genres = taxonomy.categories.find((c) => c.slug === "music")?.genres ?? [];
  const railsRaw = await Promise.all(
    genres.map((g) => listEvents({ genreSlugs: [g.slug], limit: 10 }).then((rows) => ({ genre: g, rows }))),
  );
  const rails = railsRaw.filter(({ rows }) => rows.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <h1 className="text-2xl font-bold">{LISTING_COPY.musicTitle}</h1>
      {rails.length === 0 && <EmptyState title={LISTING_COPY.emptyTitle} body={LISTING_COPY.emptyBody} />}
      {rails.map(({ genre, rows }) => (
        <Rail key={genre.slug} title={genre.name_he} href={`/music/${genre.slug}`}>
          {rows.map((e) => (
            <EventCard key={e.id} event={e} variant="rail" />
          ))}
        </Rail>
      ))}
    </div>
  );
}

export default function MusicPage() {
  return <MusicContent />;
}
