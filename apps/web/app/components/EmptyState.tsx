import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      {body && <p className="max-w-md text-sm text-[var(--text-muted)]">{body}</p>}
      {action}
    </div>
  );
}
