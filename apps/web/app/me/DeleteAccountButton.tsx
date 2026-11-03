"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/lib/actions/me";
import { ME_COPY } from "@/app/lib/copy/me";

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[var(--radius-button)] border border-[var(--status-cancelled)] px-4 py-2 text-sm font-semibold text-[var(--status-cancelled)]"
      >
        {ME_COPY.deleteAccount}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--status-cancelled)] p-4">
      <p className="text-sm font-semibold">{ME_COPY.confirmDelete}</p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            await deleteAccount();
            router.push("/");
          }}
          className="rounded-[var(--radius-button)] bg-[var(--status-cancelled)] px-4 py-2 text-sm font-semibold text-white"
        >
          {ME_COPY.confirmDeleteYes}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm"
        >
          {ME_COPY.confirmDeleteCancel}
        </button>
      </div>
    </div>
  );
}
