import { Clock } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { QueueList } from "@/components/jobs/queue-list";
import { EmptyState } from "@/components/shared/empty-state";
import { getQueuedJobs } from "@/lib/jobs/queries";

export default async function LaterPage() {
  const jobs = await getQueuedJobs();

  return (
    <>
      <Topbar title="Later" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <p className="text-sm text-muted-foreground">
          Jobs you&apos;ve saved to apply to later. They stay off your kanban board until you mark them applied.
        </p>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Your queue is empty"
            description="Check &ldquo;Save for later&rdquo; in Quick Add to bookmark jobs here before you're ready to apply."
            actionLabel="Add a job"
            actionHref="/applications/new"
          />
        ) : (
          <QueueList jobs={jobs} />
        )}
      </main>
    </>
  );
}
