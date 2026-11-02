import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getThisWeekRange } from "@tiktim/shared";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";

export const metadata: Metadata = { title: LISTING_COPY.thisWeekTitle, alternates: { canonical: "/this-week" } };

async function ThisWeekContent() {
  "use cache";
  cacheLife("hours");
  cacheTag("events");

  const range = getThisWeekRange();
  const events = await listEvents({ dateStart: range.start, dateEnd: range.end, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{LISTING_COPY.thisWeekTitle}</h1>
      <EventListingGrid events={events} emptyTitle={LISTING_COPY.emptyTitle} emptyBody={LISTING_COPY.emptyBody} />
    </div>
  );
}

export default function ThisWeekPage() {
  return <ThisWeekContent />;
}
