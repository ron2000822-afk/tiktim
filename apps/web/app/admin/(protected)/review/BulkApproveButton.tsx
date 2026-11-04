"use client";

import { useState, useTransition } from "react";
import { ADMIN_COPY } from "../../copy";
import { bulkApproveSafeEntries } from "./actions";

export function BulkApproveButton({ eligibleCount }: { eligibleCount: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (eligibleCount === 0) return null;

  function handleClick() {
    if (!window.confirm(ADMIN_COPY.review.bulkApproveConfirm)) return;
    setResult(null);
    startTransition(async () => {
      const { approved } = await bulkApproveSafeEntries();
      setResult(ADMIN_COPY.review.bulkApproveResult(approved));
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {ADMIN_COPY.review.bulkApprove} ({eligibleCount})
      </button>
      {result && <span className="text-sm text-[var(--text-muted)]">{result}</span>}
    </div>
  );
}
