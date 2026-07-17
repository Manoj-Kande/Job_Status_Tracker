"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Briefcase, FileText, ExternalLink, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { globalSearch, type JobSearchResult, type ResumeSearchResult } from "@/actions/search.actions";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

type Result = JobSearchResult | ResumeSearchResult;

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground sm:flex hover:bg-accent transition-colors"
      >
        <Search className="size-3.5" />
        Search...
        <kbd className="ml-4 rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg translate-y-0 p-0 gap-0 overflow-hidden">
          {open && <SearchPanel onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [jobs, setJobs] = React.useState<JobSearchResult[]>([]);
  const [resumes, setResumes] = React.useState<ResumeSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results: Result[] = [...jobs, ...resumes];

  React.useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(id);
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    // Nothing to do when cleared — the UI already falls back to the
    // "start typing" hint whenever the query is blank (see
    // showEmptyQueryHint below), regardless of whatever jobs/resumes are
    // still sitting in state, so there's no stale-flash risk to guard here.
    if (!q) return;

    // Two searches can be in flight at once if responses arrive out of
    // order (e.g. a slower request for an earlier keystroke resolving
    // after a faster one for a later keystroke) — `cancelled` makes sure
    // only the result for the *current* query is ever applied.
    let cancelled = false;

    // Loading flips on almost immediately (a 0ms timeout, not the effect
    // body itself — synchronous setState in an effect body cascades
    // renders) so the list is clearly marked "stale, refreshing" right
    // away, instead of silently showing the *previous* query's matches
    // for the whole 200ms debounce window below.
    const loadingHandle = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    const searchHandle = setTimeout(() => {
      globalSearch(q)
        .then((res) => {
          if (cancelled) return;
          setJobs(res.jobs);
          setResumes(res.resumes);
          setActiveIndex(0);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(loadingHandle);
      clearTimeout(searchHandle);
    };
  }, [query]);

  function go(result: Result) {
    onClose();
    if (result.kind === "job") {
      router.push(`/applications/${result.id}`);
    } else {
      window.open(result.fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) go(result);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  const showEmptyQueryHint = !query.trim();

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search companies, roles, resumes..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="max-h-80 overflow-y-auto p-1.5">
        {showEmptyQueryHint ? (
          <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
            Start typing to search your applications and resumes.
          </p>
        ) : loading ? (
          <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">Searching...</p>
        ) : results.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">No matches for &quot;{query}&quot;.</p>
        ) : (
          <>
            {jobs.length > 0 && (
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Applications
              </p>
            )}
            {jobs.map((job, i) => (
              <ResultRow
                key={job.id}
                icon={<Briefcase className="size-3.5" />}
                title={job.companyName}
                subtitle={`${job.jobTitle}${job.archived ? " · Archived" : ""}`}
                badge={STATUS_META[job.applicationStatus as keyof typeof STATUS_META]?.label}
                active={activeIndex === i}
                onClick={() => go(job)}
                onMouseEnter={() => setActiveIndex(i)}
              />
            ))}
            {resumes.length > 0 && (
              <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Resumes
              </p>
            )}
            {resumes.map((resume, i) => {
              const idx = jobs.length + i;
              return (
                <ResultRow
                  key={resume.id}
                  icon={<FileText className="size-3.5" />}
                  title={resume.name}
                  subtitle="Open resume file"
                  trailingIcon={<ExternalLink className="size-3" />}
                  active={activeIndex === idx}
                  onClick={() => go(resume)}
                  onMouseEnter={() => setActiveIndex(idx)}
                />
              );
            })}
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><CornerDownLeft className="size-3" /> to open</span>
          <span>↑↓ to navigate</span>
        </div>
      )}
    </>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  badge,
  trailingIcon,
  active,
  onClick,
  onMouseEnter,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  trailingIcon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        active ? "bg-accent" : "hover:bg-accent/60"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {badge && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {badge}
        </span>
      )}
      {trailingIcon && <span className="shrink-0 text-muted-foreground">{trailingIcon}</span>}
    </button>
  );
}
