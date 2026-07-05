import { Briefcase } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobTable } from "@/components/jobs/job-table";
import { JobCardList } from "@/components/jobs/job-card-list";
import { KanbanBoard } from "@/components/jobs/kanban-board";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getJobs, type JobSort } from "@/lib/jobs/queries";
import type { Priority, WorkMode } from "@prisma/client";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "kanban" ? "kanban" : "list";
  const page = Number(params.page) || 1;
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );

  const { jobs, total, totalPages } = await getJobs({
    search: params.search,
    priority: params.priority ? [params.priority as Priority] : undefined,
    workMode: params.workMode ? [params.workMode as WorkMode] : undefined,
    sort: (params.sort as JobSort) ?? "updatedAt",
    page: view === "kanban" ? 1 : page,
    pageSize: view === "kanban" ? 500 : 25,
  });

  return (
    <>
      <Topbar title="Applications" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <div className="flex items-center justify-between gap-2">
          <JobFilters />
          <Link href="/applications/archived" className="shrink-0 text-sm font-medium text-muted-foreground hover:underline">
            View archived
          </Link>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Add your first job to start tracking referrals, follow-ups, and interviews in one place."
            actionLabel="Add your first job"
            actionHref="/applications/new"
          />
        ) : view === "kanban" ? (
          <KanbanBoard jobs={jobs} />
        ) : (
          <>
            <JobTable jobs={jobs} />
            <JobCardList jobs={jobs} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>{total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                    {page > 1 ? (
                      <a href={`?${new URLSearchParams({ ...cleanParams, page: String(page - 1) }).toString()}`}>Previous</a>
                    ) : (
                      <span>Previous</span>
                    )}
                  </Button>
                  <span className="flex items-center px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                    {page < totalPages ? (
                      <a href={`?${new URLSearchParams({ ...cleanParams, page: String(page + 1) }).toString()}`}>Next</a>
                    ) : (
                      <span>Next</span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
