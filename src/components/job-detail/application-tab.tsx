"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import type { JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateJob } from "@/actions/job.actions";
import { parseDateInput, toDateInputValue } from "@/lib/utils";

const NO_RESUME = "__none__";

type ResumeOption = { id: string; name: string; fileUrl: string };

type AppFields = {
  dateApplied: string;
  appliedVia: NonNullable<JobApplication["appliedVia"]> | "";
  resumeVersionId: string;
  resumeVersionUsed: string;
  coverLetterUsed: boolean;
  coverLetterVersion: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterLinkedInUrl: string;
};

export function ApplicationTab({ job, resumes }: { job: JobApplication; resumes: ResumeOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<AppFields>({
    defaultValues: {
      dateApplied: toDateInputValue(job.dateApplied),
      appliedVia: job.appliedVia ?? "",
      resumeVersionId: job.resumeVersionId ?? NO_RESUME,
      resumeVersionUsed: job.resumeVersionUsed ?? "",
      coverLetterUsed: job.coverLetterUsed,
      coverLetterVersion: job.coverLetterVersion ?? "",
      recruiterName: job.recruiterName ?? "",
      recruiterEmail: job.recruiterEmail ?? "",
      recruiterLinkedInUrl: job.recruiterLinkedInUrl ?? "",
    },
  });

  const selectedResumeId = watch("resumeVersionId");
  const selectedResume = resumes.find((r) => r.id === selectedResumeId);

  async function onSubmit(values: AppFields) {
    setSaving(true);
    try {
      await updateJob(job.id, {
        ...values,
        resumeVersionId: values.resumeVersionId === NO_RESUME ? null : values.resumeVersionId,
        appliedVia: values.appliedVia || undefined,
        dateApplied: values.dateApplied ? parseDateInput(values.dateApplied) : null,
      });
      toast.success("Saved");
      router.refresh();
    } catch {
      toast.error("Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dateApplied">Date applied</Label>
          <Input id="dateApplied" type="date" {...register("dateApplied")} />
        </div>
        <div className="space-y-1.5">
          <Label>Applied via</Label>
          <Select value={watch("appliedVia") || undefined} onValueChange={(v) => setValue("appliedVia", v as AppFields["appliedVia"])}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REFERRAL">Referral</SelectItem>
              <SelectItem value="COMPANY_SITE">Company Site</SelectItem>
              <SelectItem value="LINKEDIN_EASY_APPLY">LinkedIn Easy Apply</SelectItem>
              <SelectItem value="JOB_BOARD">Job Board</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="RECRUITER">Recruiter</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Resume used</Label>
          {selectedResume && (
            <a
              href={selectedResume.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <Select value={selectedResumeId} onValueChange={(v) => setValue("resumeVersionId", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RESUME}>Not linked — type a name below</SelectItem>
            {resumes.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {resumes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No resumes in your{" "}
            <Link href="/resumes" className="underline">Resume Library</Link> yet — add one there to link it here.
          </p>
        )}
        {selectedResumeId === NO_RESUME && (
          <Input placeholder="e.g. Backend Engineer - v3" {...register("resumeVersionUsed")} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="coverLetterUsed"
          checked={watch("coverLetterUsed")}
          onCheckedChange={(v) => setValue("coverLetterUsed", !!v)}
        />
        <Label htmlFor="coverLetterUsed">Cover letter used</Label>
      </div>

      {watch("coverLetterUsed") && (
        <div className="space-y-1.5">
          <Label htmlFor="coverLetterVersion">Cover letter version</Label>
          <Input id="coverLetterVersion" {...register("coverLetterVersion")} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="recruiterName">Recruiter name</Label>
        <Input id="recruiterName" {...register("recruiterName")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="recruiterEmail">Recruiter email</Label>
          <Input id="recruiterEmail" type="email" {...register("recruiterEmail")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recruiterLinkedInUrl">Recruiter LinkedIn</Label>
          <Input id="recruiterLinkedInUrl" {...register("recruiterLinkedInUrl")} />
        </div>
      </div>

      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
