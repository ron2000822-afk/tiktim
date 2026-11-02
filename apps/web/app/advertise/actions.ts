"use server";

import { db } from "@tiktim/db";
import { advertiserInquiries } from "@tiktim/db/schema";

export async function submitAdvertiserInquiry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false };
  }

  await db.insert(advertiserInquiries).values({ name, email, message });
  return { ok: true };
}
