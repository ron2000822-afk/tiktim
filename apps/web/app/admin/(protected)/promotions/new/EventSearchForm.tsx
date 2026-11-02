import { ADMIN_COPY } from "../../../copy";

export function EventSearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form className="flex gap-2">
      <label className="sr-only" htmlFor="q">
        {ADMIN_COPY.promotions.searchEventPlaceholder}
      </label>
      <input
        id="q"
        name="q"
        defaultValue={defaultValue}
        placeholder={ADMIN_COPY.promotions.searchEventPlaceholder}
        className="flex-1 rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]">
        {ADMIN_COPY.promotions.searchButton}
      </button>
    </form>
  );
}
