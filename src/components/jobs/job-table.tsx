import Link from "next/link";
import { format } from "date-fns";
import type { JobApplication } from "@prisma/client";
import { PriorityBadge } from "@/components/shared/status-badges";
import { StatusSelectCell } from "@/components/jobs/status-select-cell";
import { JobRowActions } from "@/components/jobs/job-row-actions";

export function JobTable({ jobs }: { jobs: JobApplication[] }) {
  return (
    <div className="hidden md:block overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 text-xs text-muted-foreground backdrop-blur">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Company</th>
            <th className="px-4 py-2.5 text-left font-medium">Role</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Priority</th>
            <th className="px-4 py-2.5 text-left font-medium">Deadline</th>
            <th className="px-4 py-2.5 text-left font-medium">Next follow-up</th>
            <th className="px-4 py-2.5 text-left font-medium">Updated</th>
            <th className="w-10 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {jobs.map((job) => (
            <tr key={job.id} className="transition-colors hover:bg-accent/40">
              <td className="px-4 py-2.5 font-medium">
                <Link href={`/applications/${job.id}`} className="hover:underline">
                  {job.companyName}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{job.jobTitle}</td>
              <td className="px-4 py-2.5"><StatusSelectCell jobId={job.id} status={job.applicationStatus} /></td>
              <td className="px-4 py-2.5"><PriorityBadge priority={job.priority} /></td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {job.applicationDeadline ? format(job.applicationDeadline, "MMM d") : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {job.nextFollowUpDate ? format(job.nextFollowUpDate, "MMM d") : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{format(job.updatedAt, "MMM d")}</td>
              <td className="px-2 py-2.5">
                <JobRowActions job={job} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
