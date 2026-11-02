"use server";

import { revalidatePath } from "next/cache";
import { ensureSource, processListing } from "@tiktim/ingest/pipeline";
import { manualConnector } from "@tiktim/ingest/connectors/manual";
import type { NormalizedListing } from "@tiktim/ingest/connectors/types";
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

export async function addManualEvent(formData: FormData) {
  await assertAdmin();

  const artistNames = String(formData.get("artistNames") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const venueName = String(formData.get("venueName") ?? "").trim();
  const cityName = String(formData.get("cityName") ?? "").trim();
  const dateValue = String(formData.get("startsAt") ?? "");
  const categoryHint = String(formData.get("categoryHint") ?? "music") as "music" | "standup";
  const url = String(formData.get("url") ?? "").trim();
  const priceMinRaw = String(formData.get("priceMin") ?? "").trim();
  const priceMaxRaw = String(formData.get("priceMax") ?? "").trim();

  if (artistNames.length === 0 || !venueName || !cityName || !dateValue || !url) {
    return { ok: false, error: "חסרים שדות חובה" };
  }

  const startsAt = new Date(dateValue);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "תאריך לא תקין" };
  }

  const source = await ensureSource(manualConnector);
  const externalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const listing: NormalizedListing = {
    sourceSlug: "manual",
    externalId,
    title: artistNames.join(", "),
    artistNames,
    venueName,
    cityName,
    startsAt: startsAt.toISOString(),
    categoryHint,
    priceMin: priceMinRaw ? Number(priceMinRaw) : undefined,
    priceMax: priceMaxRaw ? Number(priceMaxRaw) : undefined,
    currency: "ILS",
    url,
  };

  const outcome = await processListing(listing, source, manualConnector);

  revalidatePath("/admin/events");
  return { ok: true, outcome };
}
