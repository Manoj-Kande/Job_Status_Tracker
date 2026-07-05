import type { ApplicationStatus } from "@prisma/client";

const CLOSED_STATUSES: ApplicationStatus[] = [
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "REJECTED",
  "WITHDRAWN",
  "ROLE_CLOSED",
  "GHOSTED",
];

export function isClosedStatus(status: ApplicationStatus) {
  return CLOSED_STATUSES.includes(status);
}

/** Suggested next-follow-up date based on the status just entered. */
export function suggestFollowUpDate(status: ApplicationStatus): Date | null {
  const now = new Date();
  if (status === "REFERRAL_REQUESTED") {
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  }
  if (status === "APPLIED_DIRECT" || status === "APPLIED_REFERRAL") {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return null;
}

/** A job is stale if not updated in 14+ days, not closed/archived, and no upcoming follow-up. */
export function isStale(job: {
  applicationStatus: ApplicationStatus;
  archived: boolean;
  updatedAt: Date;
  nextFollowUpDate: Date | null;
}): boolean {
  if (job.archived || isClosedStatus(job.applicationStatus)) return false;
  if (job.nextFollowUpDate && job.nextFollowUpDate.getTime() >= Date.now()) return false;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - job.updatedAt.getTime() > fourteenDaysMs;
}
