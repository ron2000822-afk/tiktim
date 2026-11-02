export function LegalSections({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{updated}</p>
      </div>
      {sections.map((s) => (
        <section key={s.heading} className="space-y-2">
          <h2 className="text-xl font-bold">{s.heading}</h2>
          <p className="text-[var(--text-muted)]">{s.body}</p>
        </section>
      ))}
    </div>
  );
}
