import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { ADMIN_COPY } from "../copy";

// `instant = false` tells Next's build-time Cache Components analysis to
// allow this route to block instead of requiring a Suspense boundary. It's
// NOT itself a guarantee the route is never cached at the edge — Vercel was
// found serving a cached 200 to every visitor on every /admin/* route
// (x-vercel-cache: PRERENDER) with only this flag set, because no call in
// the tree gave Next an explicit, top-level dynamic signal it could trace.
// `connection()` is that explicit signal — both are required together.
export const instant = false;

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">{ADMIN_COPY.denied.title}</h1>
        <p className="text-[var(--text-muted)]">{ADMIN_COPY.denied.body}</p>
        <form action="/admin/sign-out" method="post">
          <button
            type="submit"
            className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm"
          >
            {ADMIN_COPY.denied.signOut}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <nav className="w-48 shrink-0 space-y-1 text-sm">
        <Link href="/admin" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.dashboard}
        </Link>
        <Link href="/admin/events" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.events}
        </Link>
        <Link href="/admin/artists" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.artists}
        </Link>
        <Link href="/admin/venues" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.venues}
        </Link>
        <Link href="/admin/review" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.review}
        </Link>
        <Link href="/admin/ingestion" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.ingestion}
        </Link>
        <Link href="/admin/metrics" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.metrics}
        </Link>
        <Link href="/admin/promotions" className="block rounded-[var(--radius-button)] px-3 py-2 hover:bg-[var(--surface)]">
          {ADMIN_COPY.nav.promotions}
        </Link>
        <form action="/admin/sign-out" method="post" className="pt-4">
          <button type="submit" className="block w-full rounded-[var(--radius-button)] px-3 py-2 text-start hover:bg-[var(--surface)]">
            {ADMIN_COPY.nav.signOut}
          </button>
        </form>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
