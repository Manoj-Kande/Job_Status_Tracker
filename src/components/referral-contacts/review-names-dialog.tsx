"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateContactNames } from "@/actions/referral-contact.actions";
import { cn, linkedInHandle } from "@/lib/utils";

type ContactLite = { id: string; fullName: string; company: string; linkedInUrl: string };

type RowState = "idle" | "saving" | "done" | "error";
const BATCH_SIZE = 8;

export function ReviewNamesDialog({
  open,
  onOpenChange,
  contacts,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Only ever the isIncomplete rows — filtered by the caller. */
  contacts: ContactLite[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [rowState, setRowState] = React.useState<Record<string, RowState>>({});
  const [rowError, setRowError] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [prevOpen, setPrevOpen] = React.useState(open);

  // Reset the working draft every time the dialog opens fresh, so a name
  // typed and then abandoned last time doesn't linger.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setRowState({});
      setRowError({});
      setDrafts(
        Object.fromEntries(contacts.map((c) => [c.id, c.fullName === "Unnamed Contact" ? "" : c.fullName]))
      );
    }
  }

  const sorted = React.useMemo(
    () => [...contacts].sort((a, b) => a.company.localeCompare(b.company) || a.fullName.localeCompare(b.fullName)),
    [contacts]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) => c.company.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q) || c.linkedInUrl.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const readyCount = React.useMemo(
    () => contacts.filter((c) => (drafts[c.id] ?? "").trim() && rowState[c.id] !== "done").length,
    [contacts, drafts, rowState]
  );

  async function handleSaveAll() {
    const toSave = contacts.filter((c) => (drafts[c.id] ?? "").trim() && rowState[c.id] !== "done");
    if (toSave.length === 0) return toast.error("Type at least one name to save");

    setSaving(true);
    setProgress({ done: 0, total: toSave.length });
    setRowState((prev) => {
      const next = { ...prev };
      for (const c of toSave) next[c.id] = "saving";
      return next;
    });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
      const batch = toSave.slice(i, i + BATCH_SIZE);
      try {
        const { results } = await updateContactNames(batch.map((c) => ({ id: c.id, fullName: drafts[c.id] })));
        setRowState((prev) => {
          const next = { ...prev };
          for (const r of results) next[r.id] = r.ok ? "done" : "error";
          return next;
        });
        setRowError((prev) => {
          const next = { ...prev };
          for (const r of results) if (!r.ok && r.error) next[r.id] = r.error;
          return next;
        });
        succeeded += results.filter((r) => r.ok).length;
        failed += results.filter((r) => !r.ok).length;
      } catch {
        // Whole batch failed to even reach the server — leave those rows
        // exactly as the user left them (still editable), not silently
        // marked done. Nothing in the DB changed for this batch.
        setRowState((prev) => {
          const next = { ...prev };
          for (const c of batch) next[c.id] = "error";
          return next;
        });
        setRowError((prev) => {
          const next = { ...prev };
          for (const c of batch) next[c.id] = "Couldn't reach the server";
          return next;
        });
        failed += batch.length;
      }
      setProgress((p) => ({ ...p, done: Math.min(p.total, i + batch.length) }));
    }

    setSaving(false);
    if (succeeded > 0) {
      toast.success(`Saved ${succeeded} name${succeeded === 1 ? "" : "s"}`);
      router.refresh();
      onDone?.();
    }
    if (failed > 0) {
      toast.error(`${failed} name${failed === 1 ? "" : "s"} couldn't be saved — fix and retry`);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Names</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These {contacts.length} contact{contacts.length === 1 ? "" : "s"} have no confirmed name. Type a name and save —
            changes write straight to your saved contacts.
          </p>

          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company, or LinkedIn..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={saving}
            />
          </div>

          {saving && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Saving {progress.done}/{progress.total}...</p>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No contacts match</p>
            ) : (
              filtered.map((c) => {
                const state = rowState[c.id] ?? "idle";
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2.5 border-b border-border/60 px-3 py-2 last:border-b-0 transition-opacity",
                      state === "done" && "bg-success/5 opacity-70"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Input
                        value={drafts[c.id] ?? ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Type a name..."
                        disabled={saving || state === "done"}
                        className="h-8 text-sm"
                      />
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium">{c.company || "No company"}</span>
                        <span>·</span>
                        <span className="truncate">{linkedInHandle(c.linkedInUrl)}</span>
                      </div>
                      {state === "error" && rowError[c.id] && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="size-3" /> {rowError[c.id]}
                        </p>
                      )}
                    </div>
                    <div className="w-5 shrink-0 text-center">
                      {state === "saving" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                      {state === "done" && <Check className="size-4 text-success" />}
                      {state === "error" && <AlertCircle className="size-4 text-destructive" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{readyCount} ready to save</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {readyCount === 0 || progress.done === progress.total ? "Close" : "Cancel"}
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || readyCount === 0}>
                {saving ? "Saving..." : `Save ${readyCount || ""} Name${readyCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
