import Link from "next/link";

export function CitiesGrid({ cities }: { cities: { slug: string; nameHe: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {cities.map((city) => (
        <Link
          key={city.slug}
          href={`/city/${city.slug}`}
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center font-semibold hover:border-[var(--accent)]"
        >
          {city.nameHe}
        </Link>
      ))}
    </div>
  );
}
