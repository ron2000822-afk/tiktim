import "./load-env";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// supabase-js eagerly initializes a realtime client, which requires a native
// WebSocket global — only available on Node 22+. This project targets
// Node 20 (see root package.json engines), so a polyfill is needed here;
// the test never actually uses realtime subscriptions.
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCreds = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

// Exercises RLS through the real PostgREST layer (not @tiktim/db's direct
// Postgres connection, which bypasses RLS entirely) — this is the actual
// enforcement boundary CLAUDE.md's "RLS on all user tables" rule protects.
// Skips when Supabase credentials aren't available (e.g. CI without secrets).
describe.skipIf(!hasCreds)("RLS: follows / saved_events", () => {
  const password = randomUUID();
  const userA = { email: `rls-test-a-${randomUUID()}@example.com` };
  const userB = { email: `rls-test-b-${randomUUID()}@example.com` };
  let userAId: string;
  let userBId: string;
  let clientA: ReturnType<typeof createClient>;
  let clientB: ReturnType<typeof createClient>;
  let sharedTargetId: string;

  beforeAll(async () => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

    const [createdA, createdB] = await Promise.all([
      admin.auth.admin.createUser({ email: userA.email, password, email_confirm: true }),
      admin.auth.admin.createUser({ email: userB.email, password, email_confirm: true }),
    ]);
    userAId = createdA.data.user!.id;
    userBId = createdB.data.user!.id;
    sharedTargetId = randomUUID();

    clientA = createClient(SUPABASE_URL!, ANON_KEY!);
    clientB = createClient(SUPABASE_URL!, ANON_KEY!);
    await clientA.auth.signInWithPassword({ email: userA.email, password });
    await clientB.auth.signInWithPassword({ email: userB.email, password });

    const { error } = await clientA
      .from("follows")
      .insert({ user_id: userAId, target_type: "artist", target_id: sharedTargetId } as never);
    expect(error).toBeNull();
  });

  afterAll(async () => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    await admin.from("follows").delete().eq("user_id", userAId);
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("lets a user read their own follows", async () => {
    const { data } = await clientA.from("follows").select("*").eq("target_id", sharedTargetId);
    expect(data).toHaveLength(1);
  });

  it("hides another user's follows (RLS filters rows, not an error)", async () => {
    const { data, error } = await clientB.from("follows").select("*").eq("target_id", sharedTargetId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("rejects inserting a follow row impersonating another user", async () => {
    const { error } = await clientB
      .from("follows")
      .insert({ user_id: userAId, target_type: "city", target_id: randomUUID() } as never);
    expect(error).not.toBeNull();
  });
});
