"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ApplicationStatus, JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Section } from "@/components/jobs/quick-add-drawer";
import { jobFormSchema, type JobFormInput } from "@/lib/validations/job.schema";
import { updateJob, updateJobStatus } from "@/actions/job.actions";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";
import { toDateInputValue } from "@/lib/utils";

function buildDefaultValues(job: JobApplication): JobFormInput {
  return {
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    jobPostingUrl: job.jobPostingUrl ?? "",
    dateDiscovered: toDateInputValue(job.dateDiscovered) as unknown as Date,
    priority: job.priority,
    savedForLater: job.savedForLater,
    location: job.location ?? "",
    workMode: job.workMode,
    source: job.source,
    descriptionNotes: job.descriptionNotes ?? "",
    applicationDeadline: (toDateInputValue(job.applicationDeadline) || undefined) as unknown as Date | undefined,
    salaryRange: job.salaryRange ?? "",
    jobType: job.jobType,
    dateApplied: (toDateInputValue(job.dateApplied) || undefined) as unknown as Date | undefined,
    appliedVia: job.appliedVia ?? undefined,
    resumeVersionUsed: job.resumeVersionUsed ?? "",
    coverLetterUsed: job.coverLetterUsed,
    coverLetterVersion: job.coverLetterVersion ?? "",
    recruiterName: job.recruiterName ?? "",
    recruiterEmail: job.recruiterEmail ?? "",
    recruiterLinkedInUrl: job.recruiterLinkedInUrl ?? "",
    nextFollowUpDate: (toDateInputValue(job.nextFollowUpDate) || undefined) as unknown as Date | undefined,
    reminderNotes: job.reminderNotes ?? "",
  };
}

export function JobEditDrawer({
  job,
  open,
  onOpenChange,
}: {
  job: JobApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<ApplicationStatus>(job.applicationStatus);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormInput>({ resolver: zodResolver(jobFormSchema), defaultValues: buildDefaultValues(job) });

  // Re-sync the form whenever a different job is opened for editing.
  React.useEffect(() => {
    if (open) {
      reset(buildDefaultValues(job));
      setStatus(job.applicationStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.id]);

  async function onSubmit(values: JobFormInput) {
    setSubmitting(true);
    try {
      await updateJob(job.id, values);
      if (status !== job.applicationStatus) {
        await updateJobStatus(job.id, status);
      }
      toast.success("Job updated", { description: `${values.companyName} — ${values.jobTitle}` });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        toast.error("Sign in to save changes");
      } else {
        toast.error("Couldn't save changes. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit job</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-companyName">Company name *</Label>
            <Input id="edit-companyName" {...register("companyName")} />
            {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-jobTitle">Job title *</Label>
            <Input id="edit-jobTitle" {...register("jobTitle")} />
            {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-jobPostingUrl">Job URL</Label>
            <Input id="edit-jobPostingUrl" placeholder="https://..." {...register("jobPostingUrl")} />
            {errors.jobPostingUrl && <p className="text-xs text-destructive">{errors.jobPostingUrl.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-dateDiscovered">Date discovered *</Label>
              <Input id="edit-dateDiscovered" type="date" {...register("dateDiscovered")} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority *</Label>
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as JobFormInput["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <Checkbox
              id="edit-savedForLater"
              checked={watch("savedForLater")}
              onCheckedChange={(v) => setValue("savedForLater", !!v)}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="edit-savedForLater" className="cursor-pointer">
                Save for later (queue)
              </Label>
              <p className="text-xs text-muted-foreground">
                Keep it out of your kanban board until you&apos;re ready to apply.
              </p>
            </div>
          </div>

          <Section title="Job details">
            <div className="space-y-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" {...register("location")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Work mode</Label>
                <Select value={watch("workMode")} onValueChange={(v) => setValue("workMode", v as JobFormInput["workMode"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                    <SelectItem value="ONSITE">Onsite</SelectItem>
                    <SelectItem value="UNKNOWN">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={watch("source")} onValueChange={(v) => setValue("source", v as JobFormInput["source"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                    <SelectItem value="COMPANY_SITE">Company Site</SelectItem>
                    <SelectItem value="JOB_BOARD">Job Board</SelectItem>
                    <SelectItem value="REFERRAL_TIP">Referral Tip</SelectItem>
                    <SelectItem value="RECRUITER">Recruiter</SelectItem>
                    <SelectItem value="FRIEND">Friend</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-applicationDeadline">Application deadline</Label>
              <Input id="edit-applicationDeadline" type="date" {...register("applicationDeadline")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-salaryRange">Salary range</Label>
              <Input id="edit-salaryRange" {...register("salaryRange")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-descriptionNotes">Notes</Label>
              <Textarea id="edit-descriptionNotes" rows={3} {...register("descriptionNotes")} />
            </div>
          </Section>

          <Section title="Application details">
            <div className="space-y-1.5">
              <Label htmlFor="edit-dateApplied">Date applied</Label>
              <Input id="edit-dateApplied" type="date" {...register("dateApplied")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-recruiterName">Recruiter name</Label>
              <Input id="edit-recruiterName" {...register("recruiterName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-recruiterEmail">Recruiter email</Label>
              <Input id="edit-recruiterEmail" type="email" {...register("recruiterEmail")} />
              {errors.recruiterEmail && <p className="text-xs text-destructive">{errors.recruiterEmail.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-coverLetterUsed"
                checked={watch("coverLetterUsed")}
                onCheckedChange={(v) => setValue("coverLetterUsed", !!v)}
              />
              <Label htmlFor="edit-coverLetterUsed">Cover letter used</Label>
            </div>
          </Section>

          <Section title="Follow-up details">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nextFollowUpDate">Next follow-up date</Label>
              <Input id="edit-nextFollowUpDate" type="date" {...register("nextFollowUpDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-reminderNotes">Reminder notes</Label>
              <Textarea id="edit-reminderNotes" rows={2} {...register("reminderNotes")} />
            </div>
          </Section>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
