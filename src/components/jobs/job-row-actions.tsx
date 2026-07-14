"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, Archive, Trash2, ArchiveRestore, Clock, Pencil, BookmarkPlus, FileText } from "lucide-react";
import { toast } from "sonner";
import type { JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveJob, deleteJob, moveToQueue } from "@/actions/job.actions";
import { quickAddVaultLink } from "@/actions/vault.actions";
import { JobEditDrawer } from "@/components/jobs/job-edit-drawer";
import { AttachResumeDialog } from "@/components/jobs/attach-resume-dialog";

export function JobRowActions({ job }: { job: JobApplication }) {
  const { id, archived, jobPostingUrl: jobUrl, companyName, jobTitle, resumeVersionId } = job;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [editOpen, setEditOpen] = React.useState(false);
  const [resumeOpen, setResumeOpen] = React.useState(false);

  function handleArchive() {
    startTransition(async () => {
      try {
        await archiveJob(id, !archived);
        toast.success(archived ? "Job restored" : "Job archived");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleMoveToQueue() {
    startTransition(async () => {
      try {
        await moveToQueue(id);
        toast.success("Moved to your Later queue");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleSaveToVault() {
    if (!jobUrl) return;
    startTransition(async () => {
      try {
        await quickAddVaultLink({ url: jobUrl, title: `${companyName} — ${jobTitle}` });
        toast.success("Saved to Vault");
      } catch {
        toast.error("Couldn't save to Vault");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this job permanently? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteJob(id);
        toast.success("Job deleted");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" disabled={pending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResumeOpen(true)}>
            <FileText /> {resumeVersionId ? "Change attached resume" : "Attach resume"}
          </DropdownMenuItem>
          {jobUrl && (
            <DropdownMenuItem onClick={() => window.open(jobUrl, "_blank")}>
              <ExternalLink /> Open job posting
            </DropdownMenuItem>
          )}
          {jobUrl && (
            <DropdownMenuItem onClick={handleSaveToVault}>
              <BookmarkPlus /> Save URL to Vault
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleMoveToQueue}>
            <Clock /> Move to Later queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? "Restore" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <JobEditDrawer job={job} open={editOpen} onOpenChange={setEditOpen} />
      <AttachResumeDialog
        jobId={id}
        currentResumeId={resumeVersionId}
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

