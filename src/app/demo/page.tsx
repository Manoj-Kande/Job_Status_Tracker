import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { STATUS_META } from "@/lib/status";
import type { ApplicationStatus } from "@prisma/client";

const MOCK_SUMMARY = { toApply: 6, referralPending: 3, applied: 9, interviewing: 4, offers: 1 };

const MOCK_FUNNEL = [
  { stage: "Discovered", count: 23 },
  { stage: "Applied", count: 14 },
  { stage: "Interviewing", count: 4 },
  { stage: "Offer", count: 1 },
];

const MOCK_ACTIVITY: {
  id: string;
  company: string;
  status: ApplicationStatus;
  when: string;
}[] = [
  { id: "1", company: "Acme Corp", status: "INTERVIEW_SCHEDULED", when: "2h ago" },
  { id: "2", company: "Northwind", status: "APPLIED_REFERRAL", when: "Yesterday" },
  { id: "3", company: "Globex", status: "REFERRAL_REQUESTED", when: "2 days ago" },
  { id: "4", company: "Initech", status: "OFFER_RECEIVED", when: "4 days ago" },
];

export default function DemoPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="size-4" />
          </div>
          <span className="text-sm font-semibold">TrackHire</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 pb-20 sm:p-8">
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          You&apos;re viewing sample data. <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">Sign up</Link> to start tracking your own applications.
        </div>

        <div>
          <h2 className="text-base font-semibold">Welcome back, Alex</h2>
          <p className="text-sm text-muted-foreground">6 to apply · 4 interviewing · 2 overdue follow-ups</p>
        </div>

        <SummaryCards summary={MOCK_SUMMARY} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Application funnel</h3>
            <FunnelChart funnel={MOCK_FUNNEL} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Recent activity</h3>
            <div className="space-y-0">
              {MOCK_ACTIVITY.map((event, i) => (
                <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < MOCK_ACTIVITY.length - 1 && (
                    <span className="absolute left-[5px] top-3 h-full w-px bg-border" />
                  )}
                  <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{event.company}</span>{" "}
                      <span className="text-muted-foreground">→ {STATUS_META[event.status].label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{event.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start tracking your own applications</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
