"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/lib/use-current-user";
import { getFollowStatus, toggleFollow, type FollowTargetType } from "@/app/lib/actions/follows";
import { AuthPromptModal } from "@/app/components/AuthPromptModal";
import { capture } from "@/app/lib/posthog-client";
import { PROFILE_FOLLOW_COPY } from "@/app/lib/copy/profile";

export function FollowButton({ targetType, targetId }: { targetType: FollowTargetType; targetId: string }) {
  const { user, loading } = useCurrentUser();
  const [following, setFollowing] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFollowing(false);
      return;
    }
    getFollowStatus(targetType, targetId).then(setFollowing);
  }, [targetType, targetId, user, loading]);

  async function handleClick() {
    if (!user) {
      setPromptOpen(true);
      return;
    }

    const result = await toggleFollow(targetType, targetId);
    if ("following" in result) {
      setFollowing(result.following);
      capture(result.following ? "followed" : "unfollowed", { targetType, targetId });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={following}
        className={
          following
            ? "rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--background)]"
            : "rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-semibold hover:border-[var(--accent)]"
        }
      >
        {following ? PROFILE_FOLLOW_COPY.following : PROFILE_FOLLOW_COPY.follow}
      </button>
      {promptOpen && <AuthPromptModal kind="follow" onClose={() => setPromptOpen(false)} />}
    </>
  );
}
