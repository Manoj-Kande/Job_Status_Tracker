"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteReferralContacts, type ContactScope } from "@/actions/referral-contact.actions";
import { SearchSelectPicker } from "@/components/referral-contacts/search-select-picker";

type Scope = "companies" | "selected" | "all";
type ContactLite = { id: string; fullName: string; company: string };

export function DeleteContactsDialog({
  open,
  onOpenChange,
  selectedIds,
  contacts,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  contacts: ContactLite[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [scope, setScope] = React.useState<Scope>(selectedIds.length > 0 ? "selected" : "companies");
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

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setScope(selectedIds.length > 0 ? "selected" : "companies");
      setCompanySel(new Set());
      setContactSel(new Set(selectedIds));
    }
  }

  async function handleConfirm() {
    let matchCount = 0;
    if (scope === "companies") {
      if (companySel.size === 0) return toast.error("Select at least one company");
      matchCount = contacts.filter((c) => companySel.has(c.company.trim())).length;
    } else if (scope === "selected") {
      if (contactSel.size === 0) return toast.error("Select at least one contact");
      matchCount = contactSel.size;
    } else {
      matchCount = contacts.length;
    }
    if (matchCount === 0) return toast.error("Nothing matched — nothing was deleted");

    if (!window.confirm(`Delete ${matchCount} contact${matchCount === 1 ? "" : "s"}? This can't be undone.`)) return;

    setSubmitting(true);
    try {
      const input: ContactScope =
        scope === "companies"
          ? { scope: "companies", companies: [...companySel] }
          : scope === "selected"
            ? { scope: "ids", ids: [...contactSel] }
            : { scope: "all" };

      const result = await deleteReferralContacts(input);
      toast.success(`Deleted ${result.count} contact${result.count === 1 ? "" : "s"}`);
      onOpenChange(false);
      onDone?.();
      router.refresh();
    } catch {
      toast.error("Couldn't delete those contacts");
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel = {
    companies: "Search and select one or more companies",
    selected: "Search and select specific people",
    all: "Everything in your list",
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Contacts</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-destructive">
          This permanently removes the contacts you choose below — it can&apos;t be undone.
        </p>

        <div className="space-y-2 pt-1">
          {(["companies", "selected", "all"] as const).map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-accent/40"
            >
              <input
                type="radio"
                name="delete-scope"
                className="mt-0.5 accent-primary"
                checked={scope === s}
                onChange={() => setScope(s)}
              />
              <div className="text-sm">
                <div className="font-medium">
                  {s === "companies" ? "By company" : s === "selected" ? "Selected contacts" : "All contacts"}
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
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Deleting..." : "Delete Contacts"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
