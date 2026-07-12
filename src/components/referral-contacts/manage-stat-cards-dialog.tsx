"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { ReferralContactStatus, ReferralStatCard } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createStatCard,
  updateStatCard,
  deleteStatCard,
  reorderStatCards,
} from "@/actions/referral-stat-card.actions";

type ContactLite = { statusId: string };

export function ManageStatCardsDialog({
  open,
  onOpenChange,
  statCards,
  statuses,
  contacts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statCards: ReferralStatCard[];
  statuses: ReferralContactStatus[];
  contacts: ContactLite[];
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  function countFor(statusIds: string[]) {
    return contacts.filter((c) => statusIds.includes(c.statusId)).length;
  }

  async function handleAdd() {
    if (!newLabel.trim()) {
      toast.error("Enter a card name");
      return;
    }
    setBusy(true);
    try {
      await createStatCard(newLabel, []);
      toast.success(`Card "${newLabel.trim()}" added`);
      setNewLabel("");
      router.refresh();
    } catch {
      toast.error("Couldn't add that card");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, label: string) {
    try {
      await updateStatCard(id, { label });
      router.refresh();
    } catch {
      toast.error("Couldn't rename that card");
    }
  }

  async function handleToggleStatus(card: ReferralStatCard, statusId: string) {
    const next = card.statusIds.includes(statusId)
      ? card.statusIds.filter((id) => id !== statusId)
      : [...card.statusIds, statusId];
    try {
      await updateStatCard(card.id, { statusIds: next });
      router.refresh();
    } catch {
      toast.error("Couldn't update that card");
    }
  }

  async function handleDelete(id: string, label: string) {
    try {
      await deleteStatCard(id);
      toast.success(`Card "${label}" removed`);
      router.refresh();
    } catch {
      toast.error("Couldn't remove that card");
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const next = [...statCards];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    try {
      await reorderStatCards(next.map((c) => c.id));
      router.refresh();
    } catch {
      toast.error("Couldn't reorder cards");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize stat cards</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Each card counts contacts whose status you check below. Reorder, rename, remove, or add
          cards — the &quot;Total contacts&quot; card always stays first and can&apos;t be edited.
        </p>

        <div className="max-h-96 space-y-3 overflow-y-auto pt-1">
          {statCards.map((card, i) => (
            <div key={card.id} className="space-y-2 rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => handleMove(i, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === statCards.length - 1}
                    onClick={() => handleMove(i, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <Input
                  defaultValue={card.label}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== card.label && handleRename(card.id, e.target.value)}
                  className="h-8 flex-1"
                />
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{countFor(card.statusIds)} matched</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(card.id, card.label)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pl-6">
                {statuses.map((s) => {
                  const checked = card.statusIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        checked ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-3 accent-primary"
                        checked={checked}
                        onChange={() => handleToggleStatus(card, s.id)}
                      />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="New card name, e.g. Rejected"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={busy}>Add card</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
