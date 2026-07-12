"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { ReferralContactStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCustomStatus, deleteCustomStatus, renameCustomStatus } from "@/actions/referral-contact.actions";

export function ManageStatusesDialog({
  open,
  onOpenChange,
  statuses,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: ReferralContactStatus[];
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleAdd() {
    if (!newLabel.trim()) {
      toast.error("Enter a status name");
      return;
    }
    setBusy(true);
    try {
      await createCustomStatus(newLabel);
      toast.success(`Custom status "${newLabel.trim()}" added`);
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that status");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, label: string) {
    try {
      await renameCustomStatus(id, label);
      router.refresh();
    } catch {
      toast.error("Couldn't rename that status");
    }
  }

  async function handleDelete(id: string, label: string) {
    try {
      await deleteCustomStatus(id);
      toast.success(`Status "${label}" deleted`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error && err.message === "STATUS_IN_USE"
        ? `Reassign contacts using "${label}" before deleting it.`
        : "Couldn't delete that status.";
      toast.error("Can't delete status", { description: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage Statuses</DialogTitle></DialogHeader>
        <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
              <Badge variant="outline" className="shrink-0">{s.isCustom ? "Custom" : "Built-in"}</Badge>
              <Input
                defaultValue={s.label}
                disabled={!s.isCustom}
                onBlur={(e) => e.target.value.trim() && e.target.value !== s.label && handleRename(s.id, e.target.value)}
                className="h-8 border-none bg-transparent shadow-none focus-visible:ring-1"
              />
              {s.isCustom && (
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id, s.label)}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="New custom status, e.g. Hiring Freeze"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={busy}>Add</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Built-in statuses can&apos;t be renamed or removed. Custom statuses in use can&apos;t be deleted until
          contacts are reassigned.
        </p>
      </DialogContent>
    </Dialog>
  );
}
