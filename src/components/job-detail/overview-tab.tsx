"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateJob } from "@/actions/job.actions";
import { parseDateInput, toDateInputValue } from "@/lib/utils";

type OverviewFields = {
  location: string;
  workMode: JobApplication["workMode"];
  source: JobApplication["source"];
  applicationDeadline: string;
  salaryRange: string;
  jobType: JobApplication["jobType"];
  descriptionNotes: string;
};

export function OverviewTab({ job }: { job: JobApplication }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<OverviewFields>({
    defaultValues: {
      location: job.location ?? "",
      workMode: job.workMode,
      source: job.source,
      applicationDeadline: toDateInputValue(job.applicationDeadline),
      salaryRange: job.salaryRange ?? "",
      jobType: job.jobType,
      descriptionNotes: job.descriptionNotes ?? "",
    },
  });

  async function onSubmit(values: OverviewFields) {
    setSaving(true);
    try {
      await updateJob(job.id, {
        ...values,
        applicationDeadline: values.applicationDeadline ? parseDateInput(values.applicationDeadline) : null,
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
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...register("location")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Work mode</Label>
          <Select value={watch("workMode")} onValueChange={(v) => setValue("workMode", v as OverviewFields["workMode"])}>
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
          <Label>Job type</Label>
          <Select value={watch("jobType")} onValueChange={(v) => setValue("jobType", v as OverviewFields["jobType"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full-time</SelectItem>
              <SelectItem value="INTERNSHIP">Internship</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
              <SelectItem value="PART_TIME">Part-time</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <Label>Source</Label>
        <Select value={watch("source")} onValueChange={(v) => setValue("source", v as OverviewFields["source"])}>
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

      <div className="space-y-1.5">
        <Label htmlFor="descriptionNotes">Notes</Label>
        <Textarea id="descriptionNotes" rows={4} {...register("descriptionNotes")} />
      </div>

      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
