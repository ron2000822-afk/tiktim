import Link from "next/link";
import { QUICK_CHIPS_COPY } from "@/app/lib/copy/site";

function tomorrowDateSlug(): string {
  const now = new Date();
  const jerusalemParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const [y, m, d] = jerusalemParts.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
  return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
}

const CHIP_CLASS =
  "shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)]";

export function QuickChips() {
  return (
    <nav aria-label={QUICK_CHIPS_COPY.today} className="flex gap-2 overflow-x-auto pb-1">
      <Link href="/today" className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.today}
      </Link>
      <Link href={`/date/${tomorrowDateSlug()}`} className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.tomorrow}
      </Link>
      <Link href="/weekend" className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.weekend}
      </Link>
      <Link href="/this-week" className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.thisWeek}
      </Link>
      <Link href="/search?free=1" className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.free}
      </Link>
      <Link href="/search?outdoor=1" className={CHIP_CLASS}>
        {QUICK_CHIPS_COPY.outdoor}
      </Link>
    </nav>
  );
}
