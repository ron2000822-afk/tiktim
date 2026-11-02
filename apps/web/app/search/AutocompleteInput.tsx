"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AutocompleteSuggestion } from "@/lib/queries/autocomplete";
import { SEARCH_COPY } from "@/app/lib/copy/search";

export function AutocompleteInput({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      // Debounced sync with the autocomplete API as `value` changes — the
      // intentional pattern, not state derived from props/state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/autocomplete?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { suggestions: AutocompleteSuggestion[] }) => {
          setSuggestions(data.suggestions);
          setOpen(true);
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="search-q" className="mb-1 block text-sm font-medium">
        {SEARCH_COPY.qLabel}
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={SEARCH_COPY.qPlaceholder}
        className="w-full rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-suggestions"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={`${s.type}-${s.href}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setOpen(false);
                  router.push(s.href);
                }}
                className="block w-full px-3 py-2 text-start text-sm hover:bg-[var(--surface-2)]"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
