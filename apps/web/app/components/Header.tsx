import Link from "next/link";
import { HEADER_COPY, SITE_NAME } from "@/app/lib/copy/site";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          {SITE_NAME}
        </Link>

        <form action="/search" className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
          <label htmlFor="header-search" className="sr-only">
            {HEADER_COPY.searchPlaceholder}
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder={HEADER_COPY.searchPlaceholder}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
          />
        </form>

        <nav className="flex items-center gap-5 text-sm font-medium text-[var(--text-muted)]">
          <Link href="/music" className="hover:text-[var(--text)]">
            {HEADER_COPY.navMusic}
          </Link>
          <Link href="/standup" className="hover:text-[var(--text)]">
            {HEADER_COPY.navStandup}
          </Link>
        </nav>
      </div>
    </header>
  );
}
