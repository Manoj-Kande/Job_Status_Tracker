import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { isStale } from "@/lib/stale";
import { STATUS_META } from "@/lib/status";

const EMPTY_DASHBOARD = {
  summary: { toApply: 0, referralPending: 0, applied: 0, interviewing: 0, offers: 0 },
  dueToday: [],
  overdue: [],
  highPriorityToApply: [],
  deadlineSoon: [],
  stale: [],
  recentHistory: [],
  funnel: [
    { stage: "Discovered", count: 0 },
    { stage: "Applied", count: 0 },
    { stage: "Interviewing", count: 0 },
    { stage: "Offer", count: 0 },
  ],
  totalActive: 0,
  statusLabel: (s: string) => s,
  signedIn: false as const,
};

export async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) return EMPTY_DASHBOARD;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const sevenDaysOut = addDays(now, 7);

  // Exclude jobs sitting in the "apply later" queue — they aren't part of
  // the active pipeline until the user applies and moves them out of it.
  const baseJob = { userId: user.id, archived: false, savedForLater: false } as const;

  const [statusCounts, dueToday, overdue, highPriorityToApply, deadlineSoon, candidatesForStale, recentHistory] =
    await Promise.all([
      prisma.jobApplication.groupBy({ by: ["applicationStatus"], where: baseJob, _count: true }),
      prisma.followUp.findMany({
        where: { completed: false, followUpDate: { gte: todayStart, lte: todayEnd }, jobApplication: baseJob },
        include: { jobApplication: { select: { id: true, companyName: true, jobTitle: true } } },
      }),
      prisma.followUp.findMany({
        where: { completed: false, followUpDate: { lt: todayStart }, jobApplication: baseJob },
        include: { jobApplication: { select: { id: true, companyName: true, jobTitle: true } } },
      }),
      prisma.jobApplication.findMany({
        where: { ...baseJob, priority: "HIGH", applicationStatus: { in: ["TO_APPLY", "REFERRAL_NEEDED"] } },
        orderBy: { dateDiscovered: "desc" },
        take: 8,
      }),
      prisma.jobApplication.findMany({
        where: { ...baseJob, applicationDeadline: { gte: now, lte: sevenDaysOut } },
        orderBy: { applicationDeadline: "asc" },
        take: 8,
      }),
      prisma.jobApplication.findMany({
        where: baseJob,
        select: { id: true, companyName: true, jobTitle: true, applicationStatus: true, archived: true, updatedAt: true, nextFollowUpDate: true },
      }),
      prisma.statusHistory.findMany({
        where: { jobApplication: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { jobApplication: { select: { companyName: true, jobTitle: true } } },
      }),
    ]);

  type StatusCount = { applicationStatus: string; _count: number };
  const typedStatusCounts = statusCounts as StatusCount[];

  const countFor = (statuses: string[]) =>
    typedStatusCounts
      .filter((s: StatusCount) => statuses.includes(s.applicationStatus))
      .reduce((sum: number, s: StatusCount) => sum + s._count, 0);

  const summary = {
    toApply: countFor(["TO_APPLY", "REFERRAL_NEEDED"]),
    referralPending: countFor(["REFERRAL_REQUESTED", "REFERRAL_RECEIVED"]),
    applied: countFor(["APPLIED_DIRECT", "APPLIED_REFERRAL", "UNDER_REVIEW", "RECRUITER_SCREENING", "ASSESSMENT"]),
    interviewing: countFor([
      "INTERVIEW_SCHEDULED", "INTERVIEW_ROUND_1", "INTERVIEW_ROUND_2", "INTERVIEW_ROUND_3", "FINAL_INTERVIEW",
    ]),
    offers: countFor(["OFFER_RECEIVED", "OFFER_ACCEPTED"]),
  };

  const stale = candidatesForStale.filter((j: { applicationStatus: import("@prisma/client").ApplicationStatus; archived: boolean; updatedAt: Date; nextFollowUpDate: Date | null }) => isStale(j));

  const funnel = [
    { stage: "Discovered", count: typedStatusCounts.reduce((s: number, c: StatusCount) => s + c._count, 0) },
    { stage: "Applied", count: countFor(["APPLIED_DIRECT", "APPLIED_REFERRAL", "UNDER_REVIEW", "RECRUITER_SCREENING", "ASSESSMENT", "INTERVIEW_SCHEDULED", "INTERVIEW_ROUND_1", "INTERVIEW_ROUND_2", "INTERVIEW_ROUND_3", "FINAL_INTERVIEW", "OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED"]) },
    { stage: "Interviewing", count: countFor(["INTERVIEW_SCHEDULED", "INTERVIEW_ROUND_1", "INTERVIEW_ROUND_2", "INTERVIEW_ROUND_3", "FINAL_INTERVIEW", "OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED"]) },
    { stage: "Offer", count: countFor(["OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED"]) },
  ];

  return {
    summary,
    dueToday,
    overdue,
    highPriorityToApply,
    deadlineSoon,
    stale,
    recentHistory,
    funnel,
    totalActive: typedStatusCounts.reduce((s: number, c: StatusCount) => s + c._count, 0),
    statusLabel: (s: string) => STATUS_META[s as keyof typeof STATUS_META]?.label ?? s,
    signedIn: true as const,
  };
}
