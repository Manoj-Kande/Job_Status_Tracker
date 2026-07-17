"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

export interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

// Fixed row height + a fixed scroll-viewport height (matches the `max-h-48`
// container below) is what makes windowing possible without a measurement
// pass: for any scrollTop we can compute exactly which row indices are
// visible with simple arithmetic, no ResizeObserver needed.
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 192; // = Tailwind's max-h-48
const OVERSCAN = 4; // extra rows rendered above/below the viewport so fast scrolling doesn't flash blank rows

/** Searchable checkbox list for picking one or more companies/people, shared by
 *  the Reset Status and Delete Contacts dialogs. Only the rows currently
 *  scrolled into view are rendered — so a 5-item list and a 5,000-item list
 *  cost the same to paint and scroll. */
export function SearchSelectPicker({
  items,
  selectedIds,
  onToggle,
  onClear,
  onSelectFiltered,
  placeholder = "Search...",
  emptyText = "No matches",
}: {
  items: PickerItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  /** Optional: adds a "Select all shown" action that selects every row
   *  currently matching the search query (e.g. search "Acme" to grab
   *  everyone at that company in one click, then hand-uncheck a few). */
  onSelectFiltered?: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [scrollTop, setScrollTop] = React.useState(0);

  // Lowercasing every label/sublabel is wasted repeat work if done inside
  // the filter below (it'd re-run on every keystroke) — doing it once here,
  // keyed only on `items`, means a keystroke only does a cheap `includes()`
  // scan over strings that are already prepared. (Benchmarked: even a fully
  // naive filter stays under ~20ms at 20,000 rows, so this alone is plenty —
  // no need for startTransition/useDeferredValue on top of it, which would
  // just add a stale-render edge case for no measurable benefit here.)
  const searchIndex = React.useMemo(
    () => items.map((item) => `${item.label} ${item.sublabel ?? ""}`.toLowerCase()),
    [items]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((_, i) => searchIndex[i].includes(q));
  }, [items, searchIndex, query]);

  // A new search result set makes the old scroll position meaningless —
  // snap back to the top so the windowing math below starts from index 0.
  // Render-time adjustment (not a useEffect + setState, which React flags
  // as cascading-render-prone) — same pattern used by the dialogs above.
  // The container below is also `key`-ed on `query`, so React remounts it
  // fresh and its native scroll position resets to 0 in lockstep — no ref
  // mutation needed (mutating a ref during render is itself disallowed).
  const [prevQuery, setPrevQuery] = React.useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setScrollTop(0);
  }

  const rowsInView = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(filtered.length, startIndex + rowsInView);
  const visibleItems = filtered.slice(startIndex, endIndex);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = (filtered.length - endIndex) * ROW_HEIGHT;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search text"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div
        key={query}
        className="max-h-48 overflow-y-auto bg-card"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}
            {visibleItems.map((item) => (
              <label
                key={item.id}
                style={{ height: ROW_HEIGHT }}
                className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 text-sm hover:bg-accent/50"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.sublabel && <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>}
                </span>
              </label>
            ))}
            {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{selectedIds.size} selected</span>
        <div className="flex items-center gap-3">
          {onSelectFiltered && query.trim() && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectFiltered(filtered.map((i) => i.id))}
              className="font-medium text-primary hover:underline"
            >
              Select all shown ({filtered.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
            }}
            disabled={selectedIds.size === 0 && !query}
            className="font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground/50 disabled:no-underline"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
}
