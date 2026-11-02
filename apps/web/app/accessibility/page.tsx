import type { Metadata } from "next";
import Link from "next/link";
import { ACCESSIBILITY_COPY } from "@/app/lib/copy/legal";

export const metadata: Metadata = { title: ACCESSIBILITY_COPY.title, alternates: { canonical: "/accessibility" } };

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold">{ACCESSIBILITY_COPY.title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{ACCESSIBILITY_COPY.updated}</p>
      </div>

      <p className="text-[var(--text-muted)]">{ACCESSIBILITY_COPY.intro}</p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ACCESSIBILITY_COPY.measuresTitle}</h2>
        <ul className="list-inside list-disc space-y-1 text-[var(--text-muted)]">
          {ACCESSIBILITY_COPY.measures.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ACCESSIBILITY_COPY.noOverlayTitle}</h2>
        <p className="text-[var(--text-muted)]">{ACCESSIBILITY_COPY.noOverlayBody}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">{ACCESSIBILITY_COPY.feedbackTitle}</h2>
        <p className="text-[var(--text-muted)]">
          {ACCESSIBILITY_COPY.feedbackBody.split('"פרסמו אצלנו"')[0]}
          <Link href="/advertise" className="text-[var(--accent)] underline">
            פרסמו אצלנו
          </Link>
          {ACCESSIBILITY_COPY.feedbackBody.split('"פרסמו אצלנו"')[1]}
        </p>
      </section>
    </div>
  );
}
