"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Copy, Download, FileSpreadsheet, UserRound, Users, X } from "lucide-react";
import type { ReferralContact, ReferralContactStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SearchSelectPicker } from "@/components/referral-contacts/search-select-picker";
import { cn } from "@/lib/utils";

type ContactWithStatus = ReferralContact & { status: ReferralContactStatus };
type Scope = "all" | "companies" | "people";

// ---------- Pure helpers (no server round trip — everything the dialog
// needs is already sitting in the `contacts`/`statuses` props the parent
// loaded once) ----------

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(contacts: ContactWithStatus[]) {
  const header = ["Full Name", "Company", "Job Title", "LinkedIn URL", "Status", "Notes", "Date Added", "Last Updated"];
  const rows = contacts.map((c) =>
    [
      c.fullName,
      c.company,
      c.jobTitle ?? "",
      c.linkedInUrl,
      c.status.label,
      c.notes ?? "",
      new Date(c.createdAt).toISOString().slice(0, 10),
      new Date(c.updatedAt).toISOString().slice(0, 10),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function buildJson(contacts: ContactWithStatus[], statuses: ReferralContactStatus[]) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      statuses: statuses.map((s) => ({ label: s.label, isCustom: s.isCustom })),
      contacts: contacts.map((c) => ({
        fullName: c.fullName,
        company: c.company,
        linkedInUrl: c.linkedInUrl,
        jobTitle: c.jobTitle,
        notes: c.notes,
        status: c.status.label,
        isIncomplete: c.isIncomplete,
      })),
    },
    null,
    2
  );
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// The on-screen JSON preview exists so people can sanity-check the shape
// before exporting, not to render the whole payload — stringifying and
// laying out thousands of rows of text on every toggle is real, avoidable
// work. Copy/Download always use the full `filtered` list; only the visible
// <pre> is capped.
const PREVIEW_LIMIT = 25;

function filenameStem(scope: Scope, companies: string[], peopleCount: number) {
  if (scope === "people") return peopleCount === 1 ? "1-contact" : `${peopleCount}-contacts`;
  if (scope === "all" || companies.length === 0) return "all-contacts";
  if (companies.length === 1) return slugify(companies[0]) || "company";
  return `${companies.length}-companies`;
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// The company picker and the people picker both need the same three
// operations on a Set<string> (toggle one, add many, clear). Writing that
// logic out twice (once per picker) is how the two quietly drift apart the
// next time either one needs a fix — one hook, two call sites.
function useIdSelection() {
  const [set, setSet] = React.useState<Set<string>>(() => new Set());

  const toggle = React.useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setSet((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const addMany = React.useCallback((ids: string[]) => {
    setSet((prev) => new Set([...prev, ...ids]));
  }, []);

  const clear = React.useCallback(() => setSet(new Set()), []);
  const reset = React.useCallback(() => setSet(new Set()), []);

  return { set, toggle, remove, addMany, clear, reset };
}

export function ExportDialog({
  open,
  onOpenChange,
  contacts,
  statuses,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Full contact list, already loaded client-side by the parent view — no
   *  extra fetch needed here, so filtering by company is instant. */
  contacts: ContactWithStatus[];
  statuses: ReferralContactStatus[];
}) {
  const [scope, setScope] = React.useState<Scope>("all");
  const companies = useIdSelection();
  const people = useIdSelection();
  const [prevOpen, setPrevOpen] = React.useState(open);

  // Render-time reset (not an effect) so re-opening the dialog always starts
  // from a clean "All contacts" state instead of remembering the last export.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setScope("all");
      companies.reset();
      people.reset();
    }
  }

  const companyItems = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      const name = c.company.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([company, count]) => ({ id: company, label: company, sublabel: `${count} contact${count === 1 ? "" : "s"}` }));
  }, [contacts]);

  const selectedCompanies = React.useMemo(
    () => [...companies.set].sort((a, b) => a.localeCompare(b)),
    [companies.set]
  );

  const contactItems = React.useMemo(
    () => contacts.map((c) => ({ id: c.id, label: c.fullName, sublabel: c.company.trim() || "No company set" })),
    [contacts]
  );

  // Plain in-memory filter — no network, so this recomputes on every
  // keystroke/checkbox toggle without any loading state.
  const filtered = React.useMemo(() => {
    if (scope === "all") return contacts;
    if (scope === "people") return contacts.filter((c) => people.set.has(c.id));
    if (companies.set.size === 0) return [];
    return contacts.filter((c) => companies.set.has(c.company.trim()));
  }, [contacts, scope, companies.set, people.set]);

  const blocked = (scope === "companies" && companies.set.size === 0) || (scope === "people" && people.set.size === 0);
  const companyCount =
    scope === "all"
      ? companyItems.length
      : scope === "people"
        ? new Set(filtered.map((c) => c.company.trim())).size
        : companies.set.size;

  function guard() {
    if (blocked) {
      toast.error(scope === "people" ? "Select at least one person to export" : "Select at least one company to export");
      return true;
    }
    return false;
  }

  function handleCopy() {
    if (guard()) return;
    navigator.clipboard.writeText(buildJson(filtered, statuses)).then(() => toast.success("Copied JSON to clipboard"));
  }

  function handleDownloadJson() {
    if (guard()) return;
    download(
      buildJson(filtered, statuses),
      `referral-contacts-${filenameStem(scope, selectedCompanies, people.set.size)}-export.json`,
      "application/json"
    );
    toast.success(`Downloaded ${filtered.length} contact${filtered.length === 1 ? "" : "s"} as JSON`);
  }

  function handleDownloadCsv() {
    if (guard()) return;
    download(
      buildCsv(filtered),
      `referral-contacts-${filenameStem(scope, selectedCompanies, people.set.size)}-export.csv`,
      "text/csv"
    );
    toast.success(`Downloaded ${filtered.length} contact${filtered.length === 1 ? "" : "s"} as CSV`);
  }

  const preview = React.useMemo(() => buildJson(filtered.slice(0, PREVIEW_LIMIT), statuses), [filtered, statuses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="mb-0 border-b border-border px-7 py-4">
          <DialogTitle className="text-xl">Export Referral Contacts</DialogTitle>
          <DialogDescription>
            Export everything, pick specific companies, or hand-select individual people — even across companies.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-7 py-5">
          {/* Scope selector */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Scope</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  { key: "all" as const, label: "All contacts", icon: Users },
                  { key: "companies" as const, label: "Specific companies", icon: Building2 },
                  { key: "people" as const, label: "Specific people", icon: UserRound },
                ]
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border border-border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    scope === key ? "border-primary bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Company search + picker */}
          {scope === "companies" && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Search companies
              </span>
              <SearchSelectPicker
                items={companyItems}
                selectedIds={companies.set}
                onToggle={companies.toggle}
                onClear={companies.clear}
                onSelectFiltered={companies.addMany}
                placeholder="Search companies..."
                emptyText="No companies match"
              />

              {selectedCompanies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedCompanies.map((company) => (
                    <span
                      key={company}
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
                    >
                      {company}
                      <button
                        type="button"
                        onClick={() => companies.remove(company)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                        aria-label={`Remove ${company}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Person search + picker */}
          {scope === "people" && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Search people
              </span>
              <p className="text-xs text-muted-foreground">
                Tip: search a company name, then <span className="font-medium text-foreground">Select all shown</span>{" "}
                to grab everyone at once.
              </p>
              <SearchSelectPicker
                items={contactItems}
                selectedIds={people.set}
                onToggle={people.toggle}
                onClear={people.clear}
                onSelectFiltered={people.addMany}
                placeholder="Search people or companies..."
                emptyText="No contacts match"
              />
            </div>
          )}

          {/* Preview — its footer line doubles as the export summary, so
              there's no separate "N contacts will be exported" banner
              repeating the same count right above it. */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</span>
            <div className="overflow-hidden rounded-lg border border-border">
              <pre className="max-h-48 overflow-auto bg-muted/40 p-3.5 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                {blocked
                  ? scope === "people"
                    ? "Select at least one person to preview the export."
                    : "Select at least one company to preview the export."
                  : preview}
              </pre>
              <div className="border-t border-border bg-muted/30 px-3.5 py-1.5 text-xs text-muted-foreground">
                {blocked
                  ? "Nothing selected yet"
                  : filtered.length > PREVIEW_LIMIT
                    ? `Showing first ${PREVIEW_LIMIT} of ${filtered.length} contacts (${companyCount} compan${companyCount === 1 ? "y" : "ies"}) — the full set is included in the export`
                    : `${filtered.length} contact${filtered.length === 1 ? "" : "s"} from ${companyCount} compan${companyCount === 1 ? "y" : "ies"} ready to export`}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              JSON round-trips cleanly through Import (including custom statuses). CSV is for opening in Excel/Sheets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/20 px-7 py-3.5">
          <Button variant="outline" onClick={handleCopy} disabled={blocked}>
            <Copy className="size-3.5" /> Copy JSON
          </Button>
          <Button variant="outline" onClick={handleDownloadCsv} disabled={blocked}>
            <FileSpreadsheet className="size-3.5" /> Download .csv
          </Button>
          <Button onClick={handleDownloadJson} disabled={blocked}>
            <Download className="size-3.5" /> Download .json
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
