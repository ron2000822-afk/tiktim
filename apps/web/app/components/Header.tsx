import Link from "next/link";
import { HEADER_COPY, SITE_NAME } from "@/app/lib/copy";

export function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-[var(--text-muted)]">
          <Link href="/music" className="hover:text-[var(--text)]">
            {HEADER_COPY.navMusic}
          </Link>
          <Link href="/standup" className="hover:text-[var(--text)]">
            {HEADER_COPY.navStandup}
          </Link>
        </nav>
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
        >
          {HEADER_COPY.login}
        </button>
      </div>
    </header>
  );
}
