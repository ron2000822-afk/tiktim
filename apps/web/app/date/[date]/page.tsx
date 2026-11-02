import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatHebrewDayDate, getDateRangeForDay } from "@tiktim/shared";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { LISTING_COPY } from "@/app/lib/copy/listing";
import { listEvents } from "@/lib/queries/events";

export const instant = false;

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParam(date: string) {
  const match = DATE_REGEX.exec(date);
  if (!match) return null;
  const [, y, m, d] = match;
  return { year: Number(y), month: Number(m), day: Number(d) };
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const parsed = parseDateParam(date);
  if (!parsed) return {};
  const range = getDateRangeForDay(parsed.year, parsed.month, parsed.day);
  return { title: formatHebrewDayDate(range.start) };
}

export default async function DatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const parsed = parseDateParam(date);
  if (!parsed) notFound();

  const range = getDateRangeForDay(parsed.year, parsed.month, parsed.day);
  const events = await listEvents({ dateStart: range.start, dateEnd: range.end, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{formatHebrewDayDate(range.start)}</h1>
      <EventListingGrid events={events} emptyTitle={LISTING_COPY.emptyTitle} emptyBody={LISTING_COPY.emptyBody} />
    </div>
  );
}
