"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { emailSubscriptions, follows, profiles } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FollowTargetType } from "@/app/lib/actions/follows";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function unfollow(targetType: FollowTargetType, targetId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user) return { ok: false };

  await db
    .delete(follows)
    .where(and(eq(follows.userId, user.id), eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
  return { ok: true };
}

export async function updateNotificationPrefs(input: {
  alertsFrequency: "instant" | "daily" | "weekly" | "off";
  newsletterFrequency: "instant" | "daily" | "weekly" | "off";
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user?.email) return { ok: false };

  await db
    .insert(emailSubscriptions)
    .values({
      email: user.email,
      userId: user.id,
      alertsFrequency: input.alertsFrequency,
      newsletterFrequency: input.newsletterFrequency,
      confirmedAt: new Date(),
      consentSource: "account_signup",
      consentAt: new Date(),
      unsubscribeToken: randomUUID(),
    })
    .onConflictDoUpdate({
      target: emailSubscriptions.email,
      set: { alertsFrequency: input.alertsFrequency, newsletterFrequency: input.newsletterFrequency },
    });

  return { ok: true };
}

export async function deleteAccount(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // follows/saved_events cascade from auth.users.id on delete, but
  // email_subscriptions.user_id has no cascade (it's keyed by email, not
  // user, since anonymous newsletter signups have no user_id at all) — it
  // must be deleted explicitly or the admin.deleteUser() call below fails
  // on the FK constraint for any user who has ever had a subscription row.
  await db.delete(emailSubscriptions).where(eq(emailSubscriptions.userId, user.id));
  await db.delete(profiles).where(eq(profiles.userId, user.id));

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();

  return { ok: true };
}
