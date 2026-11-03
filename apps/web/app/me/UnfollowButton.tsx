"use client";

import { useState } from "react";
import { unfollow } from "@/app/lib/actions/me";
import type { FollowTargetType } from "@/app/lib/actions/follows";
import { ME_COPY } from "@/app/lib/copy/me";

export function UnfollowButton({ targetType, targetId }: { targetType: FollowTargetType; targetId: string }) {
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        setRemoved(true);
        await unfollow(targetType, targetId);
      }}
      className="text-sm text-[var(--text-muted)] underline hover:text-[var(--accent)]"
    >
      {ME_COPY.unfollow}
    </button>
  );
}
