import "server-only";
import { Prisma, type ApplicationStatus, type Priority, type ReferralStatus, type Source, type WorkMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type JobSort =
  | "deadline"
  | "priority"
  | "dateDiscovered"
  | "nextFollowUpDate"
  | "dateApplied"
  | "updatedAt";

export interface JobListFilters {
  search?: string;
  status?: ApplicationStatus[];
  priority?: Priority[];
  referralStatus?: ReferralStatus[];
  source?: Source[];
  workMode?: WorkMode[];
  archived?: boolean;
  /**
   * Whether to include jobs saved to the "apply later" queue.
   * Defaults to false so the active pipeline (kanban/table) stays focused
   * on jobs the user has decided to actively pursue. Pass true from the
   * Later/Queue page to see saved jobs.
   */
  includeQueued?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

const SORT_MAP: Record<JobSort, Prisma.JobApplicationOrderByWithRelationInput> = {
  deadline: { applicationDeadline: "asc" },
  priority: { priority: "asc" },
  dateDiscovered: { dateDiscovered: "desc" },
  nextFollowUpDate: { nextFollowUpDate: "asc" },
  dateApplied: { dateApplied: "desc" },
  updatedAt: { updatedAt: "desc" },
};

export async function getJobs(filters: JobListFilters = {}) {
  const user = await getCurrentUser();
  if (!user) return { jobs: [], total: 0, page: 1, pageSize: filters.pageSize ?? 25, totalPages: 1 };

  const {
    search,
    status,
    priority,
    referralStatus,
    source,
    workMode,
    archived = false,
    includeQueued = false,
    dateFrom,
    dateTo,
    sort = "updatedAt",
    page = 1,
    pageSize = 25,
  } = filters;

  const where: Prisma.JobApplicationWhereInput = {
    userId: user.id,
    archived,
    ...(includeQueued ? {} : { savedForLater: false }),
    ...(status?.length ? { applicationStatus: { in: status } } : {}),
    ...(priority?.length ? { priority: { in: priority } } : {}),
    ...(source?.length ? { source: { in: source } } : {}),
    ...(workMode?.length ? { workMode: { in: workMode } } : {}),
    ...(referralStatus?.length ? { referrals: { some: { referralStatus: { in: referralStatus } } } } : {}),
    ...(dateFrom || dateTo
      ? { dateDiscovered: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { jobTitle: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      orderBy: SORT_MAP[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { referrals: true, followUps: { where: { completed: false } } },
    }),
    prisma.jobApplication.count({ where }),
  ]);

  return { jobs, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Jobs the user has bookmarked to apply to later (not yet in the active pipeline). */
export async function getQueuedJobs() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.jobApplication.findMany({
    where: { userId: user.id, archived: false, savedForLater: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJobById(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.jobApplication.findFirst({
    where: { id, userId: user.id },
    include: {
      referrals: true,
      followUps: { orderBy: { followUpDate: "asc" } },
      interviewRounds: { orderBy: { roundNumber: "asc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      resumeVersion: true,
    },
  });
}

/** Simple duplicate check: same company + title (case-insensitive), not archived. */
export async function findLikelyDuplicate(companyName: string, jobTitle: string, excludeId?: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.jobApplication.findFirst({
    where: {
      userId: user.id,
      archived: false,
      companyName: { equals: companyName, mode: "insensitive" },
      jobTitle: { equals: jobTitle, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}
