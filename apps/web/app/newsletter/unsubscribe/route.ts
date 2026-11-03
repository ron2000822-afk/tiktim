import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { emailSubscriptions } from "@tiktim/db/schema";

async function unsubscribeByToken(token: string | null) {
  if (!token) return;
  await db.update(emailSubscriptions).set({ unsubscribedAt: new Date() }).where(eq(emailSubscriptions.unsubscribeToken, token));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  await unsubscribeByToken(searchParams.get("token"));
  return NextResponse.redirect(`${origin}/?unsubscribed=1`);
}

// RFC 8058 one-click unsubscribe: email clients POST here directly from the
// List-Unsubscribe header, without loading the GET redirect page.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  await unsubscribeByToken(searchParams.get("token"));
  return new NextResponse(null, { status: 200 });
}
