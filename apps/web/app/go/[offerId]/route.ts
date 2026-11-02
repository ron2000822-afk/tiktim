import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@tiktim/db";
import { outboundClicks } from "@tiktim/db/schema";
import { getOfferForRedirect } from "@/lib/queries/offer-redirect";

const SESSION_COOKIE = "tiktim_sid";

export async function GET(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const offer = await getOfferForRedirect(offerId);

  if (!offer) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const url = new URL(request.url);
  const page = url.searchParams.get("page") ?? request.headers.get("referer") ?? "unknown";

  const existingSessionId = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const sessionId = existingSessionId || randomUUID();

  await db.insert(outboundClicks).values({
    offerId: offer.id,
    eventId: offer.eventId,
    sourceId: offer.sourceId,
    sessionId,
    page,
  });

  const destination = offer.affiliateUrl || offer.url;
  const response = NextResponse.redirect(destination, 302);
  if (!existingSessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax" });
  }
  return response;
}
