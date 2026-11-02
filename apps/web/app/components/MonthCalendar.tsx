import Link from "next/link";

type DayCount = { day: number; count: number };

export function MonthCalendar({
  year,
  month,
  dayCounts,
  prevHref,
  nextHref,
  monthLabel,
}: {
  year: number;
  month: number;
  dayCounts: DayCount[];
  prevHref: string;
  nextHref: string;
  monthLabel: string;
}) {
  const countByDay = new Map(dayCounts.map((d) => [d.day, d.count]));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: Array<number | null> = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href={prevHref} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm">
          ‹
        </Link>
        <h2 className="font-bold">{monthLabel}</h2>
        <Link href={nextHref} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm">
          ›
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-muted)]">
        {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const count = countByDay.get(day) ?? 0;
          const dateSlug = `${year}-${pad(month)}-${pad(day)}`;
          return (
            <Link
              key={day}
              href={count > 0 ? `/date/${dateSlug}` : "#"}
              aria-disabled={count === 0}
              className={`flex aspect-square flex-col items-center justify-center rounded-[var(--radius-button)] border text-sm ${
                count > 0
                  ? "border-[var(--accent)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              <span>{day}</span>
              {count > 0 && <span className="text-xs text-[var(--accent)]">{count}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
