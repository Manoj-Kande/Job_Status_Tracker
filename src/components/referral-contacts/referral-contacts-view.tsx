"use client";

import * as React from "react";
import { Search, List as ListIcon, Building2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReferralContact, ReferralContactStatus, ReferralStatCard } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  SORT_OPTIONS,
  CUSTOM_SORT_FIELDS,
  type ReferralSortKey,
  type CustomSortConfig,
  type CustomSortField,
} from "@/lib/referral-contacts/status-meta";
import { ContactListTable } from "@/components/referral-contacts/contact-list-table";
import { ContactCompanyView } from "@/components/referral-contacts/contact-company-view";
import { ReferralStatsStrip } from "@/components/referral-contacts/referral-stats-strip";
import { ManageStatCardsDialog } from "@/components/referral-contacts/manage-stat-cards-dialog";
import { ContactFormSheet } from "@/components/referral-contacts/contact-form-sheet";
import { BulkAddDialog } from "@/components/referral-contacts/bulk-add-dialog";
import { ManageStatusesDialog } from "@/components/referral-contacts/manage-statuses-dialog";
import { ExportDialog } from "@/components/referral-contacts/export-dialog";
import { ImportDialog } from "@/components/referral-contacts/import-dialog";
import { ResetStatusDialog } from "@/components/referral-contacts/reset-status-dialog";
import { DeleteContactsDialog } from "@/components/referral-contacts/delete-contacts-dialog";
import { cn } from "@/lib/utils";

type ContactWithStatus = ReferralContact & {
  status: ReferralContactStatus;
  jobApplication?: { id: string; companyName: string; jobTitle: string } | null;
};

const PAGE_SIZE = 15;

function matchesSearch(c: ContactWithStatus, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    c.fullName.toLowerCase().includes(needle) ||
    c.company.toLowerCase().includes(needle) ||
    (c.jobTitle ?? "").toLowerCase().includes(needle)
  );
}

function compareContacts(a: ContactWithStatus, b: ContactWithStatus, sort: ReferralSortKey) {
  switch (sort) {
    case "company-asc":
      return a.company.localeCompare(b.company) || a.fullName.localeCompare(b.fullName);
    case "company-desc":
      return b.company.localeCompare(a.company) || a.fullName.localeCompare(b.fullName);
    case "name-asc":
      return a.fullName.localeCompare(b.fullName);
    case "name-desc":
      return b.fullName.localeCompare(a.fullName);
    case "recent-added":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "recent-updated":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    case "rank":
      return a.rank - b.rank;
    default:
      return 0;
  }
}

function fieldValue(c: ContactWithStatus, field: CustomSortField): string | number {
  switch (field) {
    case "company": return c.company;
    case "name": return c.fullName;
    case "jobTitle": return c.jobTitle ?? "";
    case "status": return c.status.label;
    case "createdAt": return new Date(c.createdAt).getTime();
    case "updatedAt": return new Date(c.updatedAt).getTime();
  }
}

function compareField(a: ContactWithStatus, b: ContactWithStatus, field: CustomSortField, dir: "asc" | "desc") {
  const av = fieldValue(a, field);
  const bv = fieldValue(b, field);
  const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
  return dir === "desc" ? -result : result;
}

function compareCustom(a: ContactWithStatus, b: ContactWithStatus, cfg: CustomSortConfig) {
  const r = compareField(a, b, cfg.field1, cfg.dir1);
  if (r !== 0) return r;
  if (cfg.field2 !== "none") return compareField(a, b, cfg.field2, cfg.dir2);
  return 0;
}

export function ReferralContactsView({
  contacts,
  statuses,
  statCards,
  jobOptions,
}: {
  contacts: ContactWithStatus[];
  statuses: ReferralContactStatus[];
  statCards: ReferralStatCard[];
  jobOptions: { id: string; companyName: string; jobTitle: string }[];
}) {
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"list" | "company">("list");
  const [sort, setSort] = React.useState<ReferralSortKey | "custom">("company-asc");
  const [customSort, setCustomSort] = React.useState<CustomSortConfig>({
    field1: "company",
    dir1: "asc",
    field2: "none",
    dir2: "asc",
  });
  const [customSortOpen, setCustomSortOpen] = React.useState(false);
  const [activeStatusId, setActiveStatusId] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [editingContact, setEditingContact] = React.useState<ReferralContact | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [statusesOpen, setStatusesOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [manageCardsOpen, setManageCardsOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Everything below is derived in-memory from the single `contacts` array
  // the server sent down — no network round trip for search, sort, status
  // filter, or page changes. Only actual writes (create/edit/delete/etc.)
  // trigger router.refresh(), which re-reads the (cached) server list.

  const totalCount = contacts.length;

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) counts[c.statusId] = (counts[c.statusId] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const companies = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) if (c.company.trim()) set.add(c.company.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filtered = React.useMemo(() => {
    return contacts.filter((c) => (!activeStatusId || c.statusId === activeStatusId) && matchesSearch(c, search.trim().toLowerCase()));
  }, [contacts, activeStatusId, search]);

  const sorted = React.useMemo(() => {
    if (sort === "custom") return [...filtered].sort((a, b) => compareCustom(a, b, customSort));
    return [...filtered].sort((a, b) => compareContacts(a, b, sort));
  }, [filtered, sort, customSort]);

  // Rank mode shows everything on one "page" so drag-to-reorder always
  // operates against the full (filtered) list, not just a slice of it.
  const isPaginated = sort !== "rank";
  const pageCount = isPaginated ? Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)) : 1;
  const pageItems = isPaginated ? sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : sorted;

  // Render-time adjustment (not an effect + setState, which the linter and
  // React itself flag as cascading-render-prone): whenever the filter
  // "identity" changes, snap back to page 1 in the same render pass.
  const filterKey = `${search}|${sort}|${activeStatusId}|${view}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }

  function openAdd() {
    setEditingContact(null);
    setFormOpen(true);
  }
  function openEdit(contact: ReferralContact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <ReferralStatsStrip
        statCards={statCards}
        contacts={contacts.map((c) => ({ statusId: c.statusId }))}
        onCustomize={() => setManageCardsOpen(true)}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or job title..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as ReferralSortKey | "custom");
              if (v === "custom") setCustomSortOpen(true);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sort by">
                {sort === "custom" ? "Custom sort" : SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
              <SelectItem value="custom">Custom sort...</SelectItem>
            </SelectContent>
          </Select>

          {customSortOpen && (
            <div className="absolute left-0 top-full z-30 mt-1.5 w-72 space-y-3 rounded-lg border border-border bg-card p-3 shadow-lg">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sort by</Label>
                <div className="flex gap-2">
                  <Select value={customSort.field1} onValueChange={(v) => setCustomSort((c) => ({ ...c, field1: v as CustomSortField }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CUSTOM_SORT_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex overflow-hidden rounded-md border border-border">
                    {(["asc", "desc"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomSort((c) => ({ ...c, dir1: d }))}
                        className={cn("px-2.5 text-xs font-medium", customSort.dir1 === d ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted")}
                      >
                        {d === "asc" ? "Asc" : "Desc"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Then by</Label>
                <div className="flex gap-2">
                  <Select value={customSort.field2} onValueChange={(v) => setCustomSort((c) => ({ ...c, field2: v as CustomSortField | "none" }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {CUSTOM_SORT_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex overflow-hidden rounded-md border border-border">
                    {(["asc", "desc"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomSort((c) => ({ ...c, dir2: d }))}
                        className={cn("px-2.5 text-xs font-medium", customSort.dir2 === d ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted")}
                      >
                        {d === "asc" ? "Asc" : "Desc"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setCustomSortOpen(false); if (sort === "custom") setSort("company-asc"); }}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => { setSort("custom"); setCustomSortOpen(false); }}>
                  Apply sort
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button size="sm" variant="ghost" className={cn("h-7 px-2", view === "list" && "bg-accent")} onClick={() => setView("list")}>
            <ListIcon className="size-3.5" /> List
          </Button>
          <Button size="sm" variant="ghost" className={cn("h-7 px-2", view === "company" && "bg-accent")} onClick={() => setView("company")}>
            <Building2 className="size-3.5" /> By Company
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>Reset Status</Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>Delete Contacts</Button>
          <Button variant="outline" size="sm" onClick={() => setStatusesOpen(true)}>Manage Statuses</Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>Bulk Add Links</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>Import</Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>Export</Button>
          <Button size="sm" onClick={openAdd}><Plus className="size-3.5" /> Add Contact</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveStatusId("")}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50",
            !activeStatusId && "border-primary bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          All Contacts <span className="opacity-70">{totalCount}</span>
        </button>
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStatusId(s.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50",
              activeStatusId === s.id && "border-primary bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            {s.label} <span className="opacity-70">{statusCounts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && view === "list" && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-accent/40 px-4 py-2 text-sm">
          <span>{selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setResetOpen(true)}>
              Reset Status
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {view === "list" ? (
        <ContactListTable
          contacts={pageItems}
          rankMode={sort === "rank"}
          onEdit={openEdit}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      ) : (
        <ContactCompanyView contacts={pageItems} onEdit={openEdit} />
      )}

      {isPaginated && sorted.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
          <span className="text-xs text-muted-foreground">
            Showing page {page} of {pageCount} · {sorted.length} contact{sorted.length === 1 ? "" : "s"} match
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ContactFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        statuses={statuses}
        contact={editingContact}
        jobOptions={jobOptions}
        companies={companies}
      />
      <BulkAddDialog open={bulkOpen} onOpenChange={setBulkOpen} companies={companies} />
      <ManageStatusesDialog open={statusesOpen} onOpenChange={setStatusesOpen} statuses={statuses} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ResetStatusDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        selectedIds={[...selectedIds]}
        contacts={contacts}
        onDone={() => setSelectedIds(new Set())}
      />
      <DeleteContactsDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        selectedIds={[...selectedIds]}
        contacts={contacts}
        onDone={() => setSelectedIds(new Set())}
      />
      <ManageStatCardsDialog
        open={manageCardsOpen}
        onOpenChange={setManageCardsOpen}
        statCards={statCards}
        statuses={statuses}
        contacts={contacts.map((c) => ({ statusId: c.statusId }))}
      />
    </div>
  );
}
