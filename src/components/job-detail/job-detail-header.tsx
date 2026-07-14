"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { ApplicationStatus, JobApplication, Priority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ALL_STATUSES, STATUS_META, PRIORITY_META } from "@/lib/status";
import { updateJobStatus, updateJob, archiveJob, deleteJob } from "@/actions/job.actions";

export function JobDetailHeader({ job }: { job: JobApplication }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleStatus(status: ApplicationStatus) {
    startTransition(async () => {
      try {
        await updateJobStatus(job.id, status);
        toast.success("Status updated");
        router.refresh();
      } catch {
        toast.error("Couldn't update status");
      }
    });
  }

  function handlePriority(priority: Priority) {
    startTransition(async () => {
      try {
        await updateJob(job.id, { priority });
        toast.success("Priority updated");
        router.refresh();
      } catch {
        toast.error("Couldn't update priority");
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      try {
        await archiveJob(job.id, !job.archived);
        toast.success(job.archived ? "Job restored" : "Job archived");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteJob(job.id);
        toast.success("Job deleted");
        router.push("/applications");
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold">{job.companyName}</h1>
        <p className="text-sm text-muted-foreground">{job.jobTitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={job.applicationStatus} onValueChange={(v) => handleStatus(v as ApplicationStatus)} disabled={pending}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={job.priority} onValueChange={(v) => handlePriority(v as Priority)} disabled={pending}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{PRIORITY_META[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {job.jobPostingUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={job.jobPostingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> Posting
            </a>
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleArchive} disabled={pending}>
          {job.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {job.archived ? "Restore" : "Archive"}
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this job?</DialogTitle>
              <DialogDescription>
                This permanently removes {job.companyName} — {job.jobTitle} and all related referrals, follow-ups,
                and interview history. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button variant="destructive" onClick={handleDelete} disabled={pending}>Delete permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
