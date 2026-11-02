"use client";

import { useTransition } from "react";
import { setPromotionActive } from "./actions";
import { ADMIN_COPY } from "../../copy";

export function PromotionActiveToggle({ promotionId, isActive }: { promotionId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setPromotionActive(promotionId, !isActive);
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
      {isActive ? ADMIN_COPY.promotions.deactivate : ADMIN_COPY.promotions.activate}
    </button>
  );
}
