import Link from "next/link";
import { Archive } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { JobTable } from "@/components/jobs/job-table";
import { JobCardList } from "@/components/jobs/job-card-list";
import { EmptyState } from "@/components/shared/empty-state";
import { getJobs } from "@/lib/jobs/queries";

export default async function ArchivedJobsPage() {
  const { jobs } = await getJobs({ archived: true, includeQueued: true, pageSize: 200 });

  return (
    <>
      <Topbar title="Archived" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Jobs you&apos;ve archived. Restore, edit, or delete them here.
          </p>
          <Link href="/applications" className="text-sm font-medium text-primary hover:underline">
            Back to Applications
          </Link>
        </div>

        {jobs.length === 0 ? (
          <EmptyState icon={Archive} title="No archived jobs" description="Jobs you archive from the list or kanban board show up here." />
        ) : (
          <>
            <JobTable jobs={jobs} />
            <JobCardList jobs={jobs} />
          </>
        )}
      </main>
    </>
  );
}
