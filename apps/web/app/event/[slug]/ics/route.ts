import { NextResponse } from "next/server";
import { buildEventIcs } from "@/lib/ics";
import { getEventByShortId } from "@/lib/queries/events";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shortId = slug.slice(-8);
  const event = await getEventByShortId(shortId);

  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const endsAt = new Date(event.startsAt.getTime() + 3 * 60 * 60 * 1000);
  const ics = buildEventIcs({
    uid: event.shortId,
    title: `${event.artistNameHe} - ${event.venueName}`,
    startsAt: event.startsAt,
    endsAt,
    location: `${event.venueName}, ${event.cityNameHe}`,
    description: `${event.artistNameHe} ב${event.venueName}, ${event.cityNameHe}`,
    url: `${new URL(request.url).origin}/event/${event.slug}-${event.shortId}`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.shortId}.ics"`,
    },
  });
}
