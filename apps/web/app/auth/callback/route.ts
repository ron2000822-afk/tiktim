import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@tiktim/db";
import { emailSubscriptions, profiles } from "@tiktim/db/schema";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const [existing] = await db
        .select({ onboardedAt: profiles.onboardedAt })
        .from(profiles)
        .where(eq(profiles.userId, data.user.id))
        .limit(1);

      const isOnboarded = existing ? existing.onboardedAt !== null : false;
      if (!existing) {
        await db.insert(profiles).values({ userId: data.user.id }).onConflictDoNothing({ target: profiles.userId });

        // Following something is itself the explicit opt-in for alert emails
        // about it — no separate confirmation needed on top of an already
        // Google-verified account. The marketing newsletter is a distinct,
        // broader opt-in and stays off until the user turns it on in /me.
        if (data.user.email) {
          await db
            .insert(emailSubscriptions)
            .values({
              email: data.user.email,
              userId: data.user.id,
              alertsFrequency: "instant",
              newsletterFrequency: "off",
              confirmedAt: new Date(),
              consentSource: "account_signup",
              consentAt: new Date(),
              unsubscribeToken: randomUUID(),
            })
            .onConflictDoNothing({ target: emailSubscriptions.email });
        }
      }

      if (!isOnboarded && !next.startsWith("/admin")) {
        return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const errorRedirect = next.startsWith("/admin") ? "/admin/login?error=auth" : "/?authError=1";
  return NextResponse.redirect(`${origin}${errorRedirect}`);
}
