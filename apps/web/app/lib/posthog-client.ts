import posthog from "posthog-js";

let initialized = false;

/**
 * Initializes PostHog only when both consent was granted and
 * NEXT_PUBLIC_POSTHOG_KEY is configured (the owner hasn't provided one yet —
 * this stays a graceful no-op until they do, same pattern as the other
 * optional integrations in this codebase).
 */
export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: false, // tracked manually per route change, see PostHogPageView
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function isPostHogActive() {
  return initialized;
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function resetPostHog() {
  if (!initialized) return;
  posthog.reset();
}
