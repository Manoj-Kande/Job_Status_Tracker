import { currentUser } from "@clerk/nextjs/server";
import { Bell, AlarmClock, Flame, CalendarClock, Clock3, Briefcase, Users } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { getDashboardData } from "@/lib/jobs/dashboard-queries";
import { getUpcomingReferralFollowUps } from "@/lib/referral-contacts/queries";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";

export default async function DashboardPage() {
  const [user, data] = await Promise.all([currentUser(), getDashboardData()]);
  const firstName = user?.firstName ?? "there";
  const dbUser = await getCurrentUser();
  const referralFollowUps = dbUser ? await getUpcomingReferralFollowUps(dbUser.id) : [];

  if (!data.signedIn) {
    return (
      <>
        <Topbar title="Dashboard" />
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <EmptyState
            icon={Briefcase}
            title="Browse freely, sign in to save"
            description="You can explore every page without an account. Sign in when you're ready to start tracking your own applications - your data is only ever stored once you do."
          />
          <div className="mt-4 flex justify-center">
            <Button asChild>
              <Link href="/sign-up">Sign in to start tracking</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (data.totalActive === 0) {
    return (
      <>
        <Topbar title="Dashboard" />
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <EmptyState
            icon={Briefcase}
            title={`Welcome, ${firstName}`}
            description="Add your first job application to start tracking referrals, follow-ups, and interviews — all in one place."
            actionLabel="Add your first job"
            actionHref="/applications/new"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 space-y-6 p-4 pb-20 md:p-6 md:pb-6">
        <div>
          <h2 className="text-base font-semibold">Welcome back, {firstName}</h2>
          <p className="text-sm text-muted-foreground">
            {data.summary.toApply} to apply · {data.summary.interviewing} interviewing · {data.overdue.length} overdue follow-up{data.overdue.length === 1 ? "" : "s"}
          </p>
        </div>

        <SummaryCards summary={data.summary} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WidgetCard
            title="Follow-ups due today"
            icon={Bell}
            emptyLabel="Nothing due today."
            items={data.dueToday.map((f) => ({
              id: f.id,
              primary: f.jobApplication.companyName,
              secondary: `${f.jobApplication.jobTitle} · ${format(f.followUpDate, "MMM d")}`,
              href: `/applications/${f.jobApplication.id}`,
            }))}
          />
          <WidgetCard
            title="Overdue follow-ups"
            icon={AlarmClock}
            emphasis
            emptyLabel="Nothing overdue. Nice work."
            items={data.overdue.map((f) => ({
              id: f.id,
              primary: f.jobApplication.companyName,
              secondary: `${f.jobApplication.jobTitle} · due ${format(f.followUpDate, "MMM d")}`,
              href: `/applications/${f.jobApplication.id}`,
            }))}
          />
          <WidgetCard
            title="High priority, not yet applied"
            icon={Flame}
            emptyLabel="No high-priority jobs waiting."
            items={data.highPriorityToApply.map((j) => ({
              id: j.id,
              primary: j.companyName,
              secondary: j.jobTitle,
              href: `/applications/${j.id}`,
            }))}
          />
          <WidgetCard
            title="Deadlines approaching"
            icon={CalendarClock}
            emptyLabel="No deadlines in the next 7 days."
            items={data.deadlineSoon.map((j) => ({
              id: j.id,
              primary: j.companyName,
              secondary: j.applicationDeadline ? `Due ${format(j.applicationDeadline, "MMM d")}` : "",
              href: `/applications/${j.id}`,
            }))}
          />
          <WidgetCard
            title="Stale applications"
            icon={Clock3}
            emptyLabel="Nothing stale — everything's moving."
            items={data.stale.map((j) => ({
              id: j.id,
              primary: j.companyName,
              secondary: `${j.jobTitle} · no update in 14+ days`,
              href: `/applications/${j.id}`,
            }))}
          />
          <WidgetCard
            title="Referral follow-ups due"
            icon={Users}
            emptyLabel="No referral contacts waiting on a follow-up."
            items={referralFollowUps.map((c) => ({
              id: c.id,
              primary: c.fullName,
              secondary: `${c.company || "No company set"} · due ${format(c.nextFollowUpDate!, "MMM d")}`,
              href: `/referral-contacts`,
            }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Application funnel</h3>
            <FunnelChart funnel={data.funnel} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Recent activity</h3>
            <ActivityTimeline events={data.recentHistory} />
          </div>
        </div>
      </main>
    </>
  );
}
