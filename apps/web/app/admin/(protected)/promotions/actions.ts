"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@tiktim/db";
import { genres, promotions } from "@tiktim/db/schema";
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

export async function createPromotion(formData: FormData) {
  await assertAdmin();

  const eventId = String(formData.get("eventId") ?? "").trim();
  const slot = String(formData.get("slot") ?? "") as "hero" | "genre_rail_top" | "newsletter";
  const genreSlug = String(formData.get("genreSlug") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const advertiser = String(formData.get("advertiser") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!eventId || !slot || !startsAtRaw || !endsAtRaw || !advertiser) {
    return { ok: false, error: "חסרים שדות חובה" };
  }
  if (slot === "genre_rail_top" && !genreSlug) {
    return { ok: false, error: "genreRequired" as const };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { ok: false, error: "טווח תאריכים לא תקין" };
  }

  let genreId: string | null = null;
  if (genreSlug) {
    const [genre] = await db.select({ id: genres.id }).from(genres).where(eq(genres.slug, genreSlug));
    if (!genre) return { ok: false, error: "ז'אנר לא נמצא" };
    genreId = genre.id;
  }

  await db.insert(promotions).values({
    eventId,
    slot,
    genreId,
    startsAt,
    endsAt,
    advertiser,
    price: priceRaw ? priceRaw : null,
    notes: notes || null,
  });

  revalidatePath("/admin/promotions");
  revalidatePath("/");
  return { ok: true };
}

export async function setPromotionActive(promotionId: string, isActive: boolean) {
  await assertAdmin();
  await db.update(promotions).set({ isActive }).where(eq(promotions.id, promotionId));
  revalidatePath("/admin/promotions");
  revalidatePath("/");
}
