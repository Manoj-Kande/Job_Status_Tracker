"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, FileText } from "lucide-react";
import type { ApplicationStatus, JobApplication } from "@prisma/client";
import { KANBAN_COLUMNS, STATUS_META, ALL_STATUSES } from "@/lib/status";
import { PriorityBadge } from "@/components/shared/status-badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateJobStatus } from "@/actions/job.actions";
import { JobEditDrawer } from "@/components/jobs/job-edit-drawer";
import { AttachResumeDialog } from "@/components/jobs/attach-resume-dialog";

export function KanbanBoard({ jobs }: { jobs: JobApplication[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [editingJob, setEditingJob] = React.useState<JobApplication | null>(null);
  const [resumeJob, setResumeJob] = React.useState<JobApplication | null>(null);

  function handleStatusChange(id: string, status: ApplicationStatus) {
    setPendingId(id);
    updateJobStatus(id, status)
      .then(() => {
        toast.success("Status updated");
        router.refresh();
      })
      .catch(() => toast.error("Couldn't update status"))
      .finally(() => setPendingId(null));
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((column) => {
        const columnJobs = jobs.filter((j) => STATUS_META[j.applicationStatus].group === column);
        return (
          <div key={column} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/40 p-2">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs font-semibold text-muted-foreground">{column}</span>
              <span className="text-xs text-muted-foreground">{columnJobs.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnJobs.map((job) => (
                <div key={job.id} className="rounded-md border border-border bg-card p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{job.companyName}</p>
                      <p className="truncate text-xs text-muted-foreground">{job.jobTitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => setResumeJob(job)}
                      >
                        <FileText className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => setEditingJob(job)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PriorityBadge priority={job.priority} />
                    <Select
                      value={job.applicationStatus}
                      onValueChange={(v) => handleStatusChange(job.id, v as ApplicationStatus)}
                      disabled={pendingId === job.id}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {editingJob && (
        <JobEditDrawer
          job={editingJob}
          open={!!editingJob}
          onOpenChange={(o) => !o && setEditingJob(null)}
        />
      )}

      {resumeJob && (
        <AttachResumeDialog
          jobId={resumeJob.id}
          currentResumeId={resumeJob.resumeVersionId}
          open={!!resumeJob}
          onOpenChange={(o) => !o && setResumeJob(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
