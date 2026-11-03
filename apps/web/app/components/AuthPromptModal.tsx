"use client";

import { usePathname } from "next/navigation";
import { signInWithGoogle } from "@/app/lib/use-current-user";
import { AUTH_PROMPT_COPY } from "@/app/lib/copy/site";

export function AuthPromptModal({ kind, onClose }: { kind: "follow" | "save"; onClose: () => void }) {
  const pathname = usePathname();
  const title = kind === "follow" ? AUTH_PROMPT_COPY.followTitle : AUTH_PROMPT_COPY.saveTitle;
  const body = kind === "follow" ? AUTH_PROMPT_COPY.followBody : AUTH_PROMPT_COPY.saveBody;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-[var(--text-muted)]">{body}</p>
        <button
          type="button"
          onClick={() => signInWithGoogle(pathname ?? "/")}
          className="w-full rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          {AUTH_PROMPT_COPY.cta}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-[var(--text-muted)] underline">
          {AUTH_PROMPT_COPY.cancel}
        </button>
      </div>
    </div>
  );
}
