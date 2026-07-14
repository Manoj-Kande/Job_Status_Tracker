import { Bell } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FollowUpCard } from "@/components/follow-ups/follow-up-card";
import { getFollowUpBuckets } from "@/lib/jobs/followup-queries";

export default async function FollowUpsPage() {
  const { today, thisWeek, upcoming, overdue, completed, all } = await getFollowUpBuckets();

  return (
    <>
      <Topbar title="Follow-ups" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <Tabs defaultValue={overdue.length > 0 ? "overdue" : "today"}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today {today.length > 0 && <Badge className="ml-1">{today.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue {overdue.length > 0 && <Badge variant="destructive" className="ml-1">{overdue.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {all.length === 0 ? (
              <EmptyState icon={Bell} title="No pending follow-ups" description="Everything's scheduled and caught up." />
            ) : (
              all.map((f) => <FollowUpCard key={f.id} followUp={f} />)
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-2">
            {today.length === 0 ? (
              <EmptyState icon={Bell} title="Nothing due today" description="You're all caught up for today." />
            ) : (
              today.map((f) => <FollowUpCard key={f.id} followUp={f} />)
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-2">
            {thisWeek.length === 0 ? (
              <EmptyState icon={Bell} title="Nothing coming up this week" description="Enjoy the calm." />
            ) : (
              thisWeek.map((f) => <FollowUpCard key={f.id} followUp={f} />)
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-2">
            {upcoming.length === 0 ? (
              <EmptyState icon={Bell} title="Nothing further out" description="Follow-ups scheduled beyond this week will show up here." />
            ) : (
              upcoming.map((f) => <FollowUpCard key={f.id} followUp={f} />)
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-2">
            {overdue.length === 0 ? (
              <EmptyState icon={Bell} title="No overdue follow-ups" description="Nice — everything's on track." />
            ) : (
              overdue.map((f) => <FollowUpCard key={f.id} followUp={f} overdue />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-2">
            {completed.length === 0 ? (
              <EmptyState icon={Bell} title="No completed follow-ups yet" description="Completed items will show up here." />
            ) : (
              completed.map((f) => <FollowUpCard key={f.id} followUp={f} />)
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
