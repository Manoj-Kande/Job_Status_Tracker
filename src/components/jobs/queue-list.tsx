"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import type { JobApplication } from "@prisma/client";
import { CheckCircle2, MoreHorizontal, ExternalLink, Archive, Trash2, Pencil } from "lucide-react";
import { PriorityBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { applyFromQueue, archiveJob, deleteJob } from "@/actions/job.actions";
import { JobEditDrawer } from "@/components/jobs/job-edit-drawer";

export function QueueList({ jobs }: { jobs: JobApplication[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [editingJob, setEditingJob] = React.useState<JobApplication | null>(null);

  function handleApply(job: JobApplication) {
    if (!confirm(`Mark ${job.companyName} — ${job.jobTitle} as applied and move it to your kanban board?`)) return;
    setPendingId(job.id);
    applyFromQueue(job.id)
      .then(() => {
        toast.success("Moved to kanban board", { description: `${job.companyName} marked as applied` });
        router.refresh();
      })
      .catch(() => toast.error("Couldn't move this job. Please try again."))
      .finally(() => setPendingId(null));
  }

  function handleArchive(job: JobApplication) {
    setPendingId(job.id);
    archiveJob(job.id, true)
      .then(() => {
        toast.success("Archived");
        router.refresh();
      })
      .catch(() => toast.error("Something went wrong"))
      .finally(() => setPendingId(null));
  }

  function handleDelete(job: JobApplication) {
    if (!confirm("Remove this job from your queue permanently? This cannot be undone.")) return;
    setPendingId(job.id);
    deleteJob(job.id)
      .then(() => {
        toast.success("Removed from queue");
        router.refresh();
      })
      .catch(() => toast.error("Something went wrong"))
      .finally(() => setPendingId(null));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/applications/${job.id}`} className="min-w-0">
              <p className="truncate text-sm font-semibold">{job.companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{job.jobTitle}</p>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" disabled={pendingId === job.id}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingJob(job)}>
                  <Pencil /> Edit details
                </DropdownMenuItem>
                {job.jobPostingUrl && (
                  <DropdownMenuItem onClick={() => window.open(job.jobPostingUrl!, "_blank")}>
                    <ExternalLink /> Open job posting
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleArchive(job)}>
                  <Archive /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(job)} className="text-destructive focus:text-destructive">
                  <Trash2 /> Remove from queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={job.priority} />
            {job.location && <span className="text-xs text-muted-foreground">{job.location}</span>}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Discovered {format(job.dateDiscovered, "MMM d")}</span>
            {job.applicationDeadline && <span>Due {format(job.applicationDeadline, "MMM d")}</span>}
          </div>

          <Button
            size="sm"
            className="mt-3 w-full gap-1.5"
            disabled={pendingId === job.id}
            onClick={() => handleApply(job)}
          >
            <CheckCircle2 className="size-4" />
            {pendingId === job.id ? "Moving..." : "Apply now"}
          </Button>
        </div>
      ))}

      {editingJob && (
        <JobEditDrawer job={editingJob} open={!!editingJob} onOpenChange={(o) => !o && setEditingJob(null)} />
      )}
    </div>
  );
}
