import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobDetailHeader } from "@/components/job-detail/job-detail-header";
import { OverviewTab } from "@/components/job-detail/overview-tab";
import { ApplicationTab } from "@/components/job-detail/application-tab";
import { ReferralTab } from "@/components/job-detail/referral-tab";
import { InterviewsTab } from "@/components/job-detail/interviews-tab";
import { FollowUpsTab } from "@/components/job-detail/followups-tab";
import { TimelineTab } from "@/components/job-detail/timeline-tab";
import { getJobById } from "@/lib/jobs/queries";
import { getResumes } from "@/lib/resume-queries";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, resumes] = await Promise.all([getJobById(id), getResumes()]);
  if (!job) notFound();

  return (
    <>
      <Topbar title={job.companyName} />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <JobDetailHeader job={job} />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
          <TabsContent value="referral"><ReferralTab jobId={job.id} referrals={job.referrals} /></TabsContent>
          <TabsContent value="application"><ApplicationTab job={job} resumes={resumes} /></TabsContent>
          <TabsContent value="interviews"><InterviewsTab jobId={job.id} rounds={job.interviewRounds} /></TabsContent>
          <TabsContent value="followups"><FollowUpsTab jobId={job.id} followUps={job.followUps} /></TabsContent>
          <TabsContent value="timeline"><TimelineTab events={job.statusHistory} /></TabsContent>
        </Tabs>
      </main>
    </>
  );
}
