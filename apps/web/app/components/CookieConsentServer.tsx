import { cookies } from "next/headers";
import { CONSENT_COOKIE } from "@/app/lib/consent";
import { CookieConsentBanner } from "./CookieConsentBanner";

export async function CookieConsentServer() {
  const cookieStore = await cookies();
  const initialVisible = cookieStore.get(CONSENT_COOKIE)?.value === undefined;
  return <CookieConsentBanner initialVisible={initialVisible} />;
}
