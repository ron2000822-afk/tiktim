"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { readConsentCookie } from "@/app/lib/consent";
import { capture, initPostHog } from "@/app/lib/posthog-client";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
    capture("$pageview", { $current_url: url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  return null;
}

export function PostHogProvider() {
  useEffect(() => {
    if (readConsentCookie() === "granted") initPostHog();
  }, []);

  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
