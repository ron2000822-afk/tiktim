"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@tiktim/db";
import { savedEvents, events } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function resolveEventId(eventShortId: string): Promise<string | null> {
  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.shortId, eventShortId)).limit(1);
  return row?.id ?? null;
}

export async function getSavedStatus(eventShortId: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) return false;

  const eventId = await resolveEventId(eventShortId);
  if (!eventId) return false;

  const [existing] = await db
    .select({ userId: savedEvents.userId })
    .from(savedEvents)
    .where(and(eq(savedEvents.userId, userId), eq(savedEvents.eventId, eventId)))
    .limit(1);

  return Boolean(existing);
}

export async function toggleSave(
  eventShortId: string,
): Promise<{ saved: boolean } | { error: "unauthenticated" | "not_found" }> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthenticated" };

  const eventId = await resolveEventId(eventShortId);
  if (!eventId) return { error: "not_found" };

  const [existing] = await db
    .select({ userId: savedEvents.userId })
    .from(savedEvents)
    .where(and(eq(savedEvents.userId, userId), eq(savedEvents.eventId, eventId)))
    .limit(1);

  if (existing) {
    await db.delete(savedEvents).where(and(eq(savedEvents.userId, userId), eq(savedEvents.eventId, eventId)));
    return { saved: false };
  }

  await db.insert(savedEvents).values({ userId, eventId });
  return { saved: true };
}

export async function mergeLocalSaves(eventShortIds: string[]): Promise<{ merged: number }> {
  const userId = await requireUserId();
  if (!userId || eventShortIds.length === 0) return { merged: 0 };

  const rows = await db.select({ id: events.id }).from(events).where(inArray(events.shortId, eventShortIds));
  if (rows.length === 0) return { merged: 0 };

  await db
    .insert(savedEvents)
    .values(rows.map((r) => ({ userId, eventId: r.id })))
    .onConflictDoNothing({ target: [savedEvents.userId, savedEvents.eventId] });

  return { merged: rows.length };
}
