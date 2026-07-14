"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobFormSchema, type JobFormInput } from "@/lib/validations/job.schema";
import { createJob, checkDuplicateJob } from "@/actions/job.actions";
import { toDateInputValue } from "@/lib/utils";

const defaultValues: Partial<JobFormInput> = {
  priority: "MEDIUM",
  workMode: "UNKNOWN",
  source: "OTHER",
  jobType: "FULL_TIME",
  coverLetterUsed: false,
  savedForLater: false,
  dateDiscovered: new Date(),
};

export function NewJobForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormInput>({ resolver: zodResolver(jobFormSchema), defaultValues });

  async function onSubmit(values: JobFormInput) {
    setSubmitting(true);
    try {
      const dup = await checkDuplicateJob(values.companyName, values.jobTitle);
      if (dup.isDuplicate) {
        const proceed = confirm(
          `A job at ${values.companyName} for "${values.jobTitle}" already exists. Add anyway?`
        );
        if (!proceed) {
          setSubmitting(false);
          return;
        }
      }

      const job = await createJob(values);
      toast.success(values.savedForLater ? "Saved to queue" : "Job added", {
        description: `${values.companyName} — ${values.jobTitle}`,
      });
      router.push(values.savedForLater ? "/later" : `/applications/${job.id}`);
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        toast.error("Sign in to save this job", { description: "You'll need to re-enter it after signing in." });
        router.push("/sign-in");
      } else {
        toast.error("Couldn't save the job. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Basics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name *</Label>
            <Input id="companyName" {...register("companyName")} autoFocus />
            {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Job title *</Label>
            <Input id="jobTitle" {...register("jobTitle")} />
            {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobPostingUrl">Job URL</Label>
          <Input id="jobPostingUrl" placeholder="https://..." {...register("jobPostingUrl")} />
          {errors.jobPostingUrl && <p className="text-xs text-destructive">{errors.jobPostingUrl.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dateDiscovered">Date discovered *</Label>
            <Input
              id="dateDiscovered"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              {...register("dateDiscovered")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority *</Label>
            <Select defaultValue="MEDIUM" onValueChange={(v) => setValue("priority", v as JobFormInput["priority"])}>
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
            id="savedForLaterFull"
            checked={watch("savedForLater")}
            onCheckedChange={(v) => setValue("savedForLater", !!v)}
          />
          <div className="grid gap-0.5">
            <Label htmlFor="savedForLaterFull" className="cursor-pointer">
              Save for later (queue)
            </Label>
            <p className="text-xs text-muted-foreground">
              Keep it out of your kanban board until you&apos;re ready to apply.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Job details</h3>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Work mode</Label>
            <Select defaultValue="UNKNOWN" onValueChange={(v) => setValue("workMode", v as JobFormInput["workMode"])}>
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
            <Select defaultValue="OTHER" onValueChange={(v) => setValue("source", v as JobFormInput["source"])}>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="applicationDeadline">Application deadline</Label>
            <Input id="applicationDeadline" type="date" {...register("applicationDeadline")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salaryRange">Salary range</Label>
            <Input id="salaryRange" {...register("salaryRange")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descriptionNotes">Notes</Label>
          <Textarea id="descriptionNotes" rows={3} {...register("descriptionNotes")} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/applications")}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : watch("savedForLater") ? "Save to queue" : "Save job"}
        </Button>
      </div>
    </form>
  );
}
