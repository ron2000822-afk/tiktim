import { STATUS_COPY } from "@/app/lib/copy/site";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  few_left: { bg: "var(--status-few-left)", text: "var(--background)" },
  sold_out: { bg: "var(--status-sold-out)", text: "var(--text)" },
  postponed: { bg: "var(--status-cancelled)", text: "var(--background)" },
  cancelled: { bg: "var(--status-cancelled)", text: "var(--background)" },
  unavailable: { bg: "var(--status-sold-out)", text: "var(--text)" },
  past: { bg: "var(--status-sold-out)", text: "var(--text)" },
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_COPY[status];
  if (!label) return null;
  const style = STATUS_STYLE[status] ?? { bg: "var(--surface-2)", text: "var(--text)" };

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}
