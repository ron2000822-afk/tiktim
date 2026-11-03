"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser, signInWithGoogle, signOut } from "@/app/lib/use-current-user";
import { HEADER_COPY } from "@/app/lib/copy/site";

export function AuthMenu() {
  const { user, loading } = useCurrentUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-8 w-20" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle(pathname ?? "/")}
        className="shrink-0 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:border-[var(--accent)]"
      >
        {HEADER_COPY.login}
      </button>
    );
  }

  const initial = (user.user_metadata?.full_name ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--background)]"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-10 z-40 w-44 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
        >
          <Link
            href="/me"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-[var(--radius-button)] px-3 py-2 text-sm hover:bg-[var(--background)]"
          >
            {HEADER_COPY.myAccount}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full rounded-[var(--radius-button)] px-3 py-2 text-start text-sm hover:bg-[var(--background)]"
          >
            {HEADER_COPY.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
