"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getResumeOptions, linkResumeToJob } from "@/actions/resume.actions";

const NO_RESUME = "__none__";

type ResumeOption = { id: string; name: string; fileUrl: string };

export function AttachResumeDialog({
  jobId,
  currentResumeId,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string;
  currentResumeId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach resume</DialogTitle>
        </DialogHeader>
        {open && (
          <AttachResumeForm
            key={jobId}
            jobId={jobId}
            currentResumeId={currentResumeId}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachResumeForm({
  jobId,
  currentResumeId,
  onOpenChange,
  onSaved,
}: {
  jobId: string;
  currentResumeId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [resumes, setResumes] = React.useState<ResumeOption[] | null>(null);
  const [selected, setSelected] = React.useState(currentResumeId ?? NO_RESUME);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getResumeOptions()
      .then((options) => {
        if (!cancelled) setResumes(options);
      })
      .catch(() => toast.error("Couldn't load resumes"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await linkResumeToJob(jobId, selected === NO_RESUME ? null : selected);
      toast.success(selected === NO_RESUME ? "Resume unlinked" : "Resume attached");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Couldn't attach resume");
    } finally {
      setSaving(false);
    }
  }

  const selectedResume = resumes?.find((r) => r.id === selected);

  return (
    <>
      <div className="space-y-3">
        {resumes === null ? (
          <p className="text-sm text-muted-foreground">Loading resumes...</p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No resumes in your{" "}
            <Link href="/resumes" className="underline">Resume Library</Link> yet — add one there first.
          </p>
        ) : (
          <>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RESUME}>No resume attached</SelectItem>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-1.5"><FileText className="size-3.5" />{r.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedResume && (
              <a
                href={selectedResume.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open resume <ExternalLink className="size-3" />
              </a>
            )}
          </>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="button" onClick={handleSave} disabled={saving || !resumes?.length}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
