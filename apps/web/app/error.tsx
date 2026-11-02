"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ERROR_COPY } from "@/app/lib/copy/legal";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">{ERROR_COPY.title}</h1>
      <p className="text-[var(--text-muted)]">{ERROR_COPY.body}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold"
        >
          {ERROR_COPY.retry}
        </button>
        <Link href="/" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--background)]">
          {ERROR_COPY.homeCta}
        </Link>
      </div>
    </div>
  );
}
