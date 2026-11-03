import { Resend } from "resend";
import type { ReactElement } from "react";
import { render } from "@react-email/components";

const FROM_ADDRESS = "טיקטים <noreply@tiktim.co.il>";

export async function sendEmail(input: {
  to: string;
  subject: string;
  react: ReactElement;
  headers?: Record<string, string>;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[emails] RESEND_API_KEY not set — skipping send to ${input.to}: "${input.subject}"`);
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  const html = await render(input.react);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html,
    headers: input.headers,
  });

  return { sent: true };
}
