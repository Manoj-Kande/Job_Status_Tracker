"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { completeFollowUp, deleteFollowUp } from "@/actions/followup.actions";
import { FollowUpEditDialog, type EditableFollowUp } from "@/components/follow-ups/follow-up-edit-dialog";
import type { FollowUpType } from "@prisma/client";

type FollowUpWithJob = {
  id: string;
  followUpDate: Date;
  followUpType: FollowUpType;
  completed: boolean;
  reminderNotes?: string | null;
  jobApplication: { id: string; companyName: string; jobTitle: string };
};

export function FollowUpCard({ followUp, overdue = false }: { followUp: FollowUpWithJob; overdue?: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);

  async function handleComplete() {
    try {
      await completeFollowUp(followUp.id);
      toast.success("Marked complete");
      router.refresh();
    } catch {
      toast.error("Couldn't update");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this follow-up? This cannot be undone.")) return;
    try {
      await deleteFollowUp(followUp.id);
      toast.success("Follow-up deleted");
      router.refresh();
    } catch {
      toast.error("Couldn't delete follow-up");
    }
  }

  const editable: EditableFollowUp = {
    id: followUp.id,
    followUpDate: followUp.followUpDate,
    followUpType: followUp.followUpType,
    reminderNotes: followUp.reminderNotes,
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        overdue ? "border-destructive/40 bg-destructive/5" : "border-border"
      )}
    >
      <div className="min-w-0">
        <Link href={`/applications/${followUp.jobApplication.id}`} className="truncate text-sm font-medium hover:underline">
          {followUp.jobApplication.companyName} · {followUp.jobApplication.jobTitle}
        </Link>
        <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
          {format(followUp.followUpDate, "MMM d, yyyy")} · {followUp.followUpType.replaceAll("_", " ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!followUp.completed ? (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleComplete}>
            <Check className="size-3.5" />
          </Button>
        ) : (
          <Badge variant="success">Done</Badge>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <FollowUpEditDialog
        followUp={editOpen ? editable : null}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
