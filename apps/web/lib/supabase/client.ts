import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

// A single shared instance, not a fresh client per call — the home page
// alone renders dozens of EventCards, each with its own SaveHeart calling
// useCurrentUser(), so a new client (and a new auth check + subscription)
// per call was measurably costing real hydration time in production.
export function createClient() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
