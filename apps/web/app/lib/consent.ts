export const CONSENT_COOKIE = "tiktim-consent";
export type ConsentValue = "granted" | "declined";

export function readConsentCookie(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === "granted" || value === "declined" ? value : null;
}

export function writeConsentCookie(value: ConsentValue) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${oneYear}; SameSite=Lax`;
}
