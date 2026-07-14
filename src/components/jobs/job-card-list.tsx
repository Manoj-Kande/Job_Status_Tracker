import Link from "next/link";
import { format } from "date-fns";
import type { JobApplication } from "@prisma/client";
import { PriorityBadge } from "@/components/shared/status-badges";
import { StatusSelectCell } from "@/components/jobs/status-select-cell";
import { JobRowActions } from "@/components/jobs/job-row-actions";

export function JobCardList({ jobs }: { jobs: JobApplication[] }) {
  return (
    <div className="grid gap-2 md:hidden">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/applications/${job.id}`} className="min-w-0">
              <p className="truncate text-sm font-semibold">{job.companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{job.jobTitle}</p>
            </Link>
            <JobRowActions job={job} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusSelectCell jobId={job.id} status={job.applicationStatus} />
            <PriorityBadge priority={job.priority} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{job.applicationDeadline ? `Due ${format(job.applicationDeadline, "MMM d")}` : "No deadline"}</span>
            <span>Updated {format(job.updatedAt, "MMM d")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
