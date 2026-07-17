import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { startOfMonth } from "date-fns";
import { SOURCE_LABEL } from "@/lib/status";
import type { Source } from "@prisma/client";

const INTERVIEW_STAGES = [
  "INTERVIEW_SCHEDULED", "INTERVIEW_ROUND_1", "INTERVIEW_ROUND_2", "INTERVIEW_ROUND_3", "FINAL_INTERVIEW",
];
const OFFER_STAGES = ["OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED"];
const APPLIED_STAGES = [
  "APPLIED_DIRECT", "APPLIED_REFERRAL", "UNDER_REVIEW", "RECRUITER_SCREENING", "ASSESSMENT",
  ...INTERVIEW_STAGES, ...OFFER_STAGES,
];

const EMPTY_ANALYTICS = {
  applicationsThisMonth: 0,
  referralAcceptanceRate: 0,
  directVsReferral: [{ name: "Direct", value: 0 }, { name: "Referral", value: 0 }],
  applicationToInterview: 0,
  interviewToOffer: 0,
  sourceEffectiveness: [] as { source: string; count: number }[],
  statusFunnel: [
    { stage: "Discovered", count: 0 },
    { stage: "Applied", count: 0 },
    { stage: "Interviewing", count: 0 },
    { stage: "Offer", count: 0 },
  ],
};

export async function getAnalyticsData() {
  const user = await getCurrentUser();
  if (!user) return EMPTY_ANALYTICS;
  // Exclude jobs still sitting in the "apply later" queue from analytics.
  const where = { userId: user.id, archived: false, savedForLater: false } as const;

  const monthKey = startOfMonth(new Date()).toISOString().slice(0, 7); // roll cache over at month boundary

  const [applicationsThisMonth, referrals, allJobs, sourceGroups] = await unstable_cache(
    () =>
      Promise.all([
        prisma.jobApplication.count({ where: { ...where, dateApplied: { gte: startOfMonth(new Date()) } } }),
        prisma.referral.findMany({ where: { jobApplication: { userId: user.id } }, select: { referralStatus: true } }),
        prisma.jobApplication.findMany({
          where,
          select: { id: true, applicationStatus: true, source: true, appliedVia: true },
        }),
        prisma.jobApplication.groupBy({ by: ["source"], where, _count: true }),
      ]),
    ["analytics-data", user.id, monthKey],
    { tags: [`jobs-data-${user.id}`], revalidate: 120 }
  )();

  const referralAccepted = referrals.filter((r: { referralStatus: string }) => r.referralStatus === "ACCEPTED").length;
  const referralAskedOrMore = referrals.filter((r: { referralStatus: string }) => r.referralStatus !== "NOT_ASKED").length;
  const referralAcceptanceRate = referralAskedOrMore ? Math.round((referralAccepted / referralAskedOrMore) * 100) : 0;

  const directCount = allJobs.filter((j: { appliedVia: string | null }) => j.appliedVia && j.appliedVia !== "REFERRAL").length;
  const referralCount = allJobs.filter((j: { appliedVia: string | null }) => j.appliedVia === "REFERRAL").length;

  const appliedCount = allJobs.filter((j: { applicationStatus: string }) => APPLIED_STAGES.includes(j.applicationStatus)).length;
  const interviewedCount = allJobs.filter((j: { applicationStatus: string }) => [...INTERVIEW_STAGES, ...OFFER_STAGES].includes(j.applicationStatus)).length;
  const offerCount = allJobs.filter((j: { applicationStatus: string }) => OFFER_STAGES.includes(j.applicationStatus)).length;

  const applicationToInterview = appliedCount ? Math.round((interviewedCount / appliedCount) * 100) : 0;
  const interviewToOffer = interviewedCount ? Math.round((offerCount / interviewedCount) * 100) : 0;

  const sourceEffectiveness = sourceGroups.map((g: { source: Source; _count: number }) => ({
    source: SOURCE_LABEL[g.source],
    count: g._count,
  }));

  const statusFunnel = [
    { stage: "Discovered", count: allJobs.length },
    { stage: "Applied", count: appliedCount },
    { stage: "Interviewing", count: interviewedCount },
    { stage: "Offer", count: offerCount },
  ];

  return {
    applicationsThisMonth,
    referralAcceptanceRate,
    directVsReferral: [
      { name: "Direct", value: directCount },
      { name: "Referral", value: referralCount },
    ],
    applicationToInterview,
    interviewToOffer,
    sourceEffectiveness,
    statusFunnel,
  };
}
