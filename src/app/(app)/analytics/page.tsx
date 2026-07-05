import { Topbar } from "@/components/layout/topbar";
import { getAnalyticsData } from "@/lib/jobs/analytics-queries";
import { SourceBarChart, DirectVsReferralPie, StatusFunnelBarChart } from "@/components/analytics/charts-dynamic";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <>
      <Topbar title="Analytics" />
      <main className="flex-1 space-y-6 p-4 pb-20 md:p-6 md:pb-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Applications this month" value={data.applicationsThisMonth} />
          <StatCard label="Referral acceptance rate" value={`${data.referralAcceptanceRate}%`} />
          <StatCard label="Application → Interview" value={`${data.applicationToInterview}%`} />
          <StatCard label="Interview → Offer" value={`${data.interviewToOffer}%`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">Status funnel</h3>
            <StatusFunnelBarChart data={data.statusFunnel} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">Direct vs referral</h3>
            <DirectVsReferralPie data={data.directVsReferral} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Source effectiveness</h3>
          <SourceBarChart data={data.sourceEffectiveness} />
        </div>
      </main>
    </>
  );
}
