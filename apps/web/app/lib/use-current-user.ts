"use client";

import { useCurrentUserContext } from "@/app/lib/current-user-context";

export function useCurrentUser() {
  return useCurrentUserContext();
}

export async function signInWithGoogle(next: string) {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}

export async function signOut() {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  return supabase.auth.signOut();
}
