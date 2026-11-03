import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { getDateRangeForDay, normalizeHe, taxonomy } from "@tiktim/shared";
import { EventListingGrid } from "@/app/components/EventListingGrid";
import { MonthCalendar } from "@/app/components/MonthCalendar";
import { SEARCH_COPY } from "@/app/lib/copy/search";
import { listEvents, type EventFilters } from "@/lib/queries/events";
import { listCities } from "@/lib/queries/venues";
import { AutocompleteInput } from "./AutocompleteInput";
import { SearchTracker } from "./SearchTracker";
import { logSearchQuery } from "@/lib/queries/search-log";

export const metadata: Metadata = {
  title: SEARCH_COPY.title,
  alternates: { canonical: "/search" },
  // Filter-combination results aren't meant to rank individually — the
  // canonical content lives on /music/[genre], /city/[city], etc.
  robots: { index: false },
};

export const instant = false;

type SearchParams = Record<string, string | undefined>;

function parseFilters(sp: SearchParams): EventFilters {
  return {
    searchQuery: sp.q ? normalizeHe(sp.q) : undefined,
    genreSlugs: sp.genre ? sp.genre.split(",").filter(Boolean) : undefined,
    citySlug: sp.city || undefined,
    priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
    weekdays: sp.weekday ? sp.weekday.split(",").map(Number) : undefined,
    venueTypes: sp.venueType ? sp.venueType.split(",").filter(Boolean) : undefined,
    outdoorOnly: sp.outdoor === "1",
    freeOnly: sp.free === "1",
    availableOnly: sp.available === "1",
    sort: (sp.sort as EventFilters["sort"]) || "date",
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "calendar" ? "calendar" : "grid";
  const musicGenres = taxonomy.categories.flatMap((c) => c.genres);
  const cities = await listCities();

  const now = new Date();
  const monthParam = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [calYear, calMonth] = monthParam.split("-").map(Number);

  const hasActiveFilters = Boolean(
    sp.q || sp.genre || sp.city || sp.priceMax || sp.weekday || sp.venueType || sp.outdoor || sp.free || sp.available,
  );

  const events = view === "grid" ? await listEvents({ ...filters, limit: 48 }) : [];

  if (hasActiveFilters && view === "grid") {
    // Fire-and-forget: a logging failure shouldn't break the search page itself.
    logSearchQuery(sp.q, filters as unknown as Record<string, unknown>, events.length).catch(() => {});
  }

  let dayCounts: { day: number; count: number }[] = [];
  if (view === "calendar") {
    const monthStart = getDateRangeForDay(calYear, calMonth, 1).start;
    const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate();
    const monthEnd = getDateRangeForDay(calYear, calMonth, daysInMonth).end;
    const monthEvents = await listEvents({ ...filters, dateStart: monthStart, dateEnd: monthEnd, limit: 500 });
    const counts = new Map<number, number>();
    for (const e of monthEvents) {
      const day = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", day: "numeric" }).format(e.startsAt),
      );
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    dayCounts = Array.from(counts, ([day, count]) => ({ day, count }));
  }

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val);
    }
    return `/search?${params.toString()}`;
  };

  const prevMonthDate = new Date(Date.UTC(calYear, calMonth - 2, 1));
  const nextMonthDate = new Date(Date.UTC(calYear, calMonth, 1));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {hasActiveFilters && <SearchTracker filters={{ ...filters, view }} resultCount={events.length} />}
      <h1 className="text-2xl font-bold">{SEARCH_COPY.title}</h1>

      <form className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3">
        <AutocompleteInput defaultValue={sp.q ?? ""} />

        <div>
          <label htmlFor="search-city" className="mb-1 block text-sm font-medium">
            {SEARCH_COPY.cityLabel}
          </label>
          <select
            id="search-city"
            name="city"
            defaultValue={sp.city ?? ""}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="">{SEARCH_COPY.cityAny}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nameHe}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-sort" className="mb-1 block text-sm font-medium">
            {SEARCH_COPY.sortLabel}
          </label>
          <select
            id="search-sort"
            name="sort"
            defaultValue={sp.sort ?? "date"}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            <option value="date">{SEARCH_COPY.sortDate}</option>
            <option value="popularity">{SEARCH_COPY.sortPopularity}</option>
            <option value="price">{SEARCH_COPY.sortPrice}</option>
          </select>
        </div>

        <fieldset className="sm:col-span-3">
          <legend className="mb-1 text-sm font-medium">{SEARCH_COPY.genreLabel}</legend>
          <div className="flex flex-wrap gap-3">
            {musicGenres.map((g) => (
              <label key={g.slug} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="genre"
                  value={g.slug}
                  defaultChecked={sp.genre?.split(",").includes(g.slug)}
                />
                {g.name_he}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="search-price" className="mb-1 block text-sm font-medium">
            {SEARCH_COPY.priceLabel}
          </label>
          <input
            id="search-price"
            name="priceMax"
            type="number"
            min={0}
            defaultValue={sp.priceMax ?? ""}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">{SEARCH_COPY.weekdayLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {SEARCH_COPY.weekdays.map((label, i) => (
              <label key={i} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekday" value={i} defaultChecked={sp.weekday?.split(",").includes(String(i))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="outdoor" value="1" defaultChecked={sp.outdoor === "1"} />
            {SEARCH_COPY.outdoorLabel}
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="free" value="1" defaultChecked={sp.free === "1"} />
            {SEARCH_COPY.freeLabel}
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="available" value="1" defaultChecked={sp.available === "1"} />
            {SEARCH_COPY.availableLabel}
          </label>
        </div>

        <div className="flex items-end gap-3 sm:col-span-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--background)]"
          >
            {SEARCH_COPY.apply}
          </button>
          {hasActiveFilters && (
            <Link href="/search" className="text-sm text-[var(--text-muted)] underline">
              {SEARCH_COPY.clear}
            </Link>
          )}
        </div>
      </form>

      <div className="flex gap-2 text-sm">
        <Link
          href={buildHref({ view: undefined })}
          className={`inline-flex min-h-11 items-center rounded-full border px-3 ${view === "grid" ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
        >
          {SEARCH_COPY.viewGrid}
        </Link>
        <Link
          href={buildHref({ view: "calendar" })}
          className={`inline-flex min-h-11 items-center rounded-full border px-3 ${view === "calendar" ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
        >
          {SEARCH_COPY.viewCalendar}
        </Link>
      </div>

      <h2 className="sr-only">{SEARCH_COPY.resultsTitle}</h2>

      {view === "grid" ? (
        <EventListingGrid events={events} emptyTitle={SEARCH_COPY.emptyTitle} emptyBody={SEARCH_COPY.emptyBody} />
      ) : (
        <MonthCalendar
          year={calYear}
          month={calMonth}
          dayCounts={dayCounts}
          monthLabel={new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(Date.UTC(calYear, calMonth - 1, 1)))}
          prevHref={buildHref({ view: "calendar", month: `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}` })}
          nextHref={buildHref({ view: "calendar", month: `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}` })}
        />
      )}
    </div>
  );
}
