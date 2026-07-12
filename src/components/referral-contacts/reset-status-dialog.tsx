"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resetReferralContactStatuses, type ResetStatusScope } from "@/actions/referral-contact.actions";
import { SearchSelectPicker } from "@/components/referral-contacts/search-select-picker";

type Scope = "all" | "companies" | "selected";
type ContactLite = { id: string; fullName: string; company: string };

export function ResetStatusDialog({
  open,
  onOpenChange,
  selectedIds,
  contacts,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Ids of contacts currently checked in the list view, if any. */
  selectedIds: string[];
  /** Full contact list (client-loaded already) — powers the company & people pickers. */
  contacts: ContactLite[];
  /** Called after a successful reset so the caller can clear its selection. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [scope, setScope] = React.useState<Scope>(selectedIds.length > 0 ? "selected" : "all");
  const [companySel, setCompanySel] = React.useState<Set<string>>(new Set());
  const [contactSel, setContactSel] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);

  const companyItems = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) if (c.company.trim()) counts.set(c.company.trim(), (counts.get(c.company.trim()) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([company, count]) => ({ id: company, label: company, sublabel: `${count} contact${count === 1 ? "" : "s"}` }));
  }, [contacts]);

  const contactItems = React.useMemo(
    () => contacts.map((c) => ({ id: c.id, label: c.fullName, sublabel: c.company || "No company set" })),
    [contacts]
  );

  // Render-time adjustment when the dialog transitions to open — resets scope/selections synchronously.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setScope(selectedIds.length > 0 ? "selected" : "all");
      setCompanySel(new Set());
      setContactSel(new Set(selectedIds));
    }
  }

  async function handleConfirm() {
    if (scope === "companies" && companySel.size === 0) {
      toast.error("Select at least one company");
      return;
    }
    if (scope === "selected" && contactSel.size === 0) {
      toast.error("Select at least one contact");
      return;
    }

    setSubmitting(true);
    try {
      const input: ResetStatusScope =
        scope === "all"
          ? { scope: "all" }
          : scope === "companies"
            ? { scope: "companies", companies: [...companySel] }
            : { scope: "ids", ids: [...contactSel] };

      const result = await resetReferralContactStatuses(input);
      toast.success(
        result.count === 0
          ? "No contacts matched — nothing was changed"
          : `Reset ${result.count} contact${result.count === 1 ? "" : "s"} to "${result.defaultStatusLabel}"`
      );
      onOpenChange(false);
      onDone?.();
      router.refresh();
    } catch {
      toast.error("Couldn't reset those statuses");
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel = {
    all: "Every contact in your list",
    companies: "Search and select one or more companies",
    selected: "Search and select specific people",
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Status</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Useful after importing someone else&apos;s contacts, or when a batch of statuses drifted out of date —
          this sets the status back to your first default stage without touching names, notes, or links.
        </p>

        <div className="space-y-2 pt-1">
          {(["all", "companies", "selected"] as const).map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-accent/40"
            >
              <input
                type="radio"
                name="reset-scope"
                className="mt-0.5 accent-primary"
                checked={scope === s}
                onChange={() => setScope(s)}
              />
              <div className="text-sm">
                <div className="font-medium">
                  {s === "all" ? "All contacts" : s === "companies" ? "By company" : "Selected contacts"}
                </div>
                <div className="text-xs text-muted-foreground">{scopeLabel[s]}</div>
              </div>
            </label>
          ))}
        </div>

        {scope === "companies" && (
          <SearchSelectPicker
            items={companyItems}
            selectedIds={companySel}
            onToggle={(id) =>
              setCompanySel((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onClear={() => setCompanySel(new Set())}
            placeholder="Search companies..."
            emptyText="No companies match"
          />
        )}

        {scope === "selected" && (
          <SearchSelectPicker
            items={contactItems}
            selectedIds={contactSel}
            onToggle={(id) =>
              setContactSel((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onClear={() => setContactSel(new Set())}
            placeholder="Search people..."
            emptyText="No contacts match"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Resetting..." : "Reset Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
