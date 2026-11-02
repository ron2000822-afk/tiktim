"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@tiktim/db";
import { sources } from "@tiktim/db/schema";
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

export async function setSourceActive(sourceId: string, isActive: boolean) {
  await assertAdmin();
  await db.update(sources).set({ isActive }).where(eq(sources.id, sourceId));
  revalidatePath("/admin/ingestion");
}
