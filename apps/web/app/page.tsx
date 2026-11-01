import { HOME_COPY } from "@/app/lib/copy";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {HOME_COPY.heroTitle}
      </h1>
      <p className="text-lg text-[var(--text-muted)]">{HOME_COPY.heroSubtitle}</p>
      <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm text-[var(--text-muted)]">
        {HOME_COPY.placeholderNotice}
      </p>
    </div>
  );
}
