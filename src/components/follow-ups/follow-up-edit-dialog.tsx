"use client";

import * as React from "react";
import { toast } from "sonner";
import type { FollowUpType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateFollowUp } from "@/actions/followup.actions";
import { parseDateInput, toDateInputValue } from "@/lib/utils";

const TYPES: FollowUpType[] = ["REFERRAL", "APPLICATION", "RECRUITER", "INTERVIEW", "OFFER", "OTHER"];

export interface EditableFollowUp {
  id: string;
  followUpDate: Date;
  followUpType: FollowUpType;
  reminderNotes?: string | null;
}

export function FollowUpEditDialog({
  followUp,
  open,
  onOpenChange,
  onSaved,
}: {
  followUp: EditableFollowUp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit follow-up</DialogTitle>
        </DialogHeader>
        {followUp && (
          <FollowUpEditForm
            key={followUp.id}
            followUp={followUp}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FollowUpEditForm({
  followUp,
  onOpenChange,
  onSaved,
}: {
  followUp: EditableFollowUp;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [date, setDate] = React.useState(() => toDateInputValue(followUp.followUpDate));
  const [type, setType] = React.useState<FollowUpType>(followUp.followUpType);
  const [notes, setNotes] = React.useState(followUp.reminderNotes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      await updateFollowUp(followUp.id, {
        followUpDate: parseDateInput(date),
        followUpType: type,
        reminderNotes: notes || null,
      });
      toast.success("Follow-up updated");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Couldn't update follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="fu-date">Date</Label>
            <Input id="fu-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fu-notes">Notes</Label>
          <Textarea id="fu-notes" rows={3} placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="button" onClick={handleSave} disabled={saving || !date}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
