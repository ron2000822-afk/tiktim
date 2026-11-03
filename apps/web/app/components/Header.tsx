import Link from "next/link";
import { HEADER_COPY, SITE_NAME } from "@/app/lib/copy/site";
// AuthMenu (and the Supabase browser client it pulls in via useCurrentUser)
// is deferred into its own chunk, loaded after the critical render path —
// auth state isn't needed for first paint, and eagerly bundling it into
// every page's initial JS measurably regressed Lighthouse mobile
// performance (93 -> 83) once Phase 4 added it here plus two more
// Supabase-client-using components mounted on every page. `ssr: false` is
// only valid inside a Client Component, hence the wrapper.
import { AuthMenuLazy as AuthMenu } from "@/app/components/AuthMenuLazy";

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

        <AuthMenu />
      </div>
    </header>
  );
}
