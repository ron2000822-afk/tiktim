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

export async function setSourceAffiliateConfig(formData: FormData) {
  await assertAdmin();

  const sourceId = String(formData.get("sourceId") ?? "");
  const affiliateProgram = String(formData.get("affiliateProgram") ?? "").trim();
  const affiliateConfigRaw = String(formData.get("affiliateConfig") ?? "").trim();

  if (!sourceId) return { ok: false, error: "חסר מזהה מקור" };

  let affiliateConfig: unknown = null;
  if (affiliateConfigRaw) {
    try {
      affiliateConfig = JSON.parse(affiliateConfigRaw);
    } catch {
      return { ok: false, error: "ההגדרות חייבות להיות JSON תקין" };
    }
  }

  await db
    .update(sources)
    .set({ affiliateProgram: affiliateProgram || null, affiliateConfig })
    .where(eq(sources.id, sourceId));

  revalidatePath("/admin/ingestion");
  return { ok: true };
}
