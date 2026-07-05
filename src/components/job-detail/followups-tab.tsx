"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import type { FollowUp, FollowUpType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Bell, Check, Pencil, Trash2 } from "lucide-react";
import { createFollowUp, completeFollowUp, deleteFollowUp } from "@/actions/followup.actions";
import { FollowUpEditDialog } from "@/components/follow-ups/follow-up-edit-dialog";
import { parseDateInput } from "@/lib/utils";

const TYPES: FollowUpType[] = ["REFERRAL", "APPLICATION", "RECRUITER", "INTERVIEW", "OFFER", "OTHER"];

export function FollowUpsTab({ jobId, followUps }: { jobId: string; followUps: FollowUp[] }) {
  const router = useRouter();
  const [date, setDate] = React.useState("");
  const [type, setType] = React.useState<FollowUpType>("APPLICATION");
  const [saving, setSaving] = React.useState(false);
  const [editingFollowUp, setEditingFollowUp] = React.useState<FollowUp | null>(null);

  async function handleAdd() {
    if (!date) return;
    setSaving(true);
    try {
      await createFollowUp(jobId, { followUpDate: parseDateInput(date), followUpType: type });
      toast.success("Follow-up scheduled");
      setDate("");
      router.refresh();
    } catch {
      toast.error("Couldn't schedule follow-up");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      await completeFollowUp(id);
      toast.success("Marked complete");
      router.refresh();
    } catch {
      toast.error("Couldn't update");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this follow-up? This cannot be undone.")) return;
    try {
      await deleteFollowUp(id);
      toast.success("Follow-up deleted");
      router.refresh();
    } catch {
      toast.error("Couldn't delete follow-up");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {followUps.length === 0 ? (
        <EmptyState icon={Bell} title="No follow-ups scheduled" description="Schedule one below." />
      ) : (
        <div className="space-y-2">
          {followUps.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">{f.followUpType.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{format(f.followUpDate, "MMM d, yyyy")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={f.completed ? "success" : "warning"}>{f.completed ? "Completed" : "Pending"}</Badge>
                {!f.completed && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleComplete(f.id)}>
                    <Check className="size-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingFollowUp(f)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(f.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <Label className="text-xs text-muted-foreground">Schedule a follow-up</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replaceAll("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={saving || !date}>
          {saving ? "Scheduling..." : "Schedule"}
        </Button>
      </div>

      <FollowUpEditDialog
        followUp={editingFollowUp}
        open={!!editingFollowUp}
        onOpenChange={(open) => !open && setEditingFollowUp(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
