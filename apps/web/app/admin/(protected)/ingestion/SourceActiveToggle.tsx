"use client";

import { useTransition } from "react";
import { setSourceActive } from "./actions";
import { ADMIN_COPY } from "../../copy";

export function SourceActiveToggle({ sourceId, isActive }: { sourceId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setSourceActive(sourceId, !isActive);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={
        isActive
          ? "rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]"
          : "rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--background)]"
      }
    >
      {isActive ? ADMIN_COPY.ingestion.deactivate : ADMIN_COPY.ingestion.activate}
    </button>
  );
}
