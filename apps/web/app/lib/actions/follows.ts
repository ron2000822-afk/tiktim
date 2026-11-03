"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { follows } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";

export type FollowTargetType = "artist" | "genre" | "city" | "venue";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getFollowStatus(targetType: FollowTargetType, targetId: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) return false;

  const [existing] = await db
    .select({ userId: follows.userId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)))
    .limit(1);

  return Boolean(existing);
}

export async function toggleFollow(
  targetType: FollowTargetType,
  targetId: string,
): Promise<{ following: boolean } | { error: "unauthenticated" }> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthenticated" };

  const [existing] = await db
    .select({ userId: follows.userId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)))
    .limit(1);

  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
    return { following: false };
  }

  await db.insert(follows).values({ userId, targetType, targetId });
  return { following: true };
}
