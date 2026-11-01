"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_COPY } from "../copy";

export default function AdminLoginPage() {
  const [error, setError] = useState(false);

  async function handleSignIn() {
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (signInError) setError(true);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.login.title}</h1>
      <p className="text-[var(--text-muted)]">{ADMIN_COPY.login.subtitle}</p>
      {error && <p className="text-[var(--status-cancelled)]">{ADMIN_COPY.login.error}</p>}
      <button
        type="button"
        onClick={handleSignIn}
        className="rounded-[var(--radius-button)] bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--background)]"
      >
        {ADMIN_COPY.login.button}
      </button>
    </div>
  );
}
