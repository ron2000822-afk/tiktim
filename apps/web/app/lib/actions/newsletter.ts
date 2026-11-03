"use server";

import { randomUUID } from "node:crypto";
import { db } from "@tiktim/db";
import { emailSubscriptions } from "@tiktim/db/schema";
import { sendEmail, NewsletterConfirm } from "@tiktim/emails";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean }> {
  if (!EMAIL_REGEX.test(email)) return { ok: false };

  const confirmToken = randomUUID();
  const unsubscribeToken = randomUUID();

  await db
    .insert(emailSubscriptions)
    .values({
      email,
      confirmToken,
      unsubscribeToken,
      consentSource: "newsletter_signup_home",
      consentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: emailSubscriptions.email,
      set: { confirmToken, consentSource: "newsletter_signup_home", consentAt: new Date(), unsubscribedAt: null },
    });

  const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${confirmToken}`;
  await sendEmail({
    to: email,
    subject: "אישור הרשמה לניוזלטר של טיקטים",
    react: NewsletterConfirm({ confirmUrl }),
  });

  return { ok: true };
}
