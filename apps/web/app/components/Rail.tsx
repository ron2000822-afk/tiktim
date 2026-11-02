import Link from "next/link";
import type { ReactNode } from "react";
import { RAIL_COPY } from "@/app/lib/copy/site";

export function Rail({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-[var(--accent)]">
            {RAIL_COPY.seeAll}
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x [scrollbar-width:thin]">{children}</div>
    </section>
  );
}
