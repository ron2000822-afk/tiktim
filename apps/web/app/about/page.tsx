import type { Metadata } from "next";
import Link from "next/link";
import { ABOUT_COPY } from "@/app/lib/copy/legal";

export const metadata: Metadata = { title: ABOUT_COPY.title };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-extrabold">{ABOUT_COPY.title}</h1>
      <p className="text-lg text-[var(--text-muted)]">{ABOUT_COPY.intro}</p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ABOUT_COPY.neutralTitle}</h2>
        <p className="text-[var(--text-muted)]">{ABOUT_COPY.neutralBody}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ABOUT_COPY.notTitle}</h2>
        <p className="text-[var(--text-muted)]">{ABOUT_COPY.notBody}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ABOUT_COPY.revenueTitle}</h2>
        <p className="text-[var(--text-muted)]">{ABOUT_COPY.revenueBody}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ABOUT_COPY.contactTitle}</h2>
        <p className="text-[var(--text-muted)]">
          {ABOUT_COPY.contactBody}
          <Link href="/advertise" className="text-[var(--accent)] underline">
            {ABOUT_COPY.contactLinkText}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
