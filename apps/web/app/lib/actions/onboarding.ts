"use server";

import { eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { profiles, follows } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function completeOnboarding(input: {
  genreIds: string[];
  regionId: string | null;
  artistIds: string[];
}): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false };

  await db
    .update(profiles)
    .set({ homeRegionId: input.regionId, onboardedAt: new Date() })
    .where(eq(profiles.userId, userId));

  const followRows = [
    ...input.genreIds.map((targetId) => ({ userId, targetType: "genre" as const, targetId })),
    ...input.artistIds.map((targetId) => ({ userId, targetType: "artist" as const, targetId })),
  ];

  if (followRows.length > 0) {
    await db
      .insert(follows)
      .values(followRows)
      .onConflictDoNothing({ target: [follows.userId, follows.targetType, follows.targetId] });
  }

  return { ok: true };
}

export async function skipOnboarding(): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false };

  await db.update(profiles).set({ onboardedAt: new Date() }).where(eq(profiles.userId, userId));
  return { ok: true };
}
