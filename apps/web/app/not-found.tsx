import Link from "next/link";
import { NOT_FOUND_COPY } from "@/app/lib/copy/legal";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">{NOT_FOUND_COPY.title}</h1>
      <p className="text-[var(--text-muted)]">{NOT_FOUND_COPY.body}</p>
      <div className="flex gap-3">
        <Link href="/search" className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold">
          {NOT_FOUND_COPY.searchCta}
        </Link>
        <Link href="/" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--background)]">
          {NOT_FOUND_COPY.homeCta}
        </Link>
      </div>
    </div>
  );
}
