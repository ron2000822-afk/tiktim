"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@tiktim/db";
import { events } from "@tiktim/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    throw new Error("Not authorized");
  }
}

export async function toggleFeatured(eventId: string, nextValue: boolean) {
  await assertAdmin();
  await db.update(events).set({ isFeatured: nextValue }).where(eq(events.id, eventId));
  revalidatePath("/admin/events");
}
