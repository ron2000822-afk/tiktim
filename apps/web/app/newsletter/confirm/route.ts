import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { emailSubscriptions } from "@tiktim/db/schema";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    await db
      .update(emailSubscriptions)
      .set({ confirmedAt: new Date(), confirmToken: null })
      .where(eq(emailSubscriptions.confirmToken, token));
  }

  return NextResponse.redirect(`${origin}/?newsletterConfirmed=1`);
}
