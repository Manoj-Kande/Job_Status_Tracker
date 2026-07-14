import type { ApplicationStatus, Priority, WorkMode, Source } from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export const STATUS_META: Record<ApplicationStatus, { label: string; variant: BadgeVariant; group: string }> = {
  TO_APPLY: { label: "To Apply", variant: "secondary", group: "To Apply" },
  REFERRAL_NEEDED: { label: "Referral Needed", variant: "secondary", group: "To Apply" },
  REFERRAL_REQUESTED: { label: "Referral Requested", variant: "warning", group: "Referral Requested" },
  REFERRAL_RECEIVED: { label: "Referral Received", variant: "success", group: "Referral Requested" },
  APPLIED_DIRECT: { label: "Applied (Direct)", variant: "outline", group: "Applied" },
  APPLIED_REFERRAL: { label: "Applied (Referral)", variant: "outline", group: "Applied" },
  UNDER_REVIEW: { label: "Under Review", variant: "outline", group: "Under Review" },
  RECRUITER_SCREENING: { label: "Recruiter Screening", variant: "outline", group: "Under Review" },
  ASSESSMENT: { label: "Assessment", variant: "warning", group: "Under Review" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", variant: "warning", group: "Interviewing" },
  INTERVIEW_ROUND_1: { label: "Interview Round 1", variant: "warning", group: "Interviewing" },
  INTERVIEW_ROUND_2: { label: "Interview Round 2", variant: "warning", group: "Interviewing" },
  INTERVIEW_ROUND_3: { label: "Interview Round 3", variant: "warning", group: "Interviewing" },
  FINAL_INTERVIEW: { label: "Final Interview", variant: "warning", group: "Interviewing" },
  OFFER_RECEIVED: { label: "Offer Received", variant: "success", group: "Offer" },
  OFFER_ACCEPTED: { label: "Offer Accepted", variant: "success", group: "Offer" },
  OFFER_DECLINED: { label: "Offer Declined", variant: "secondary", group: "Closed" },
  REJECTED: { label: "Rejected", variant: "destructive", group: "Closed" },
  WITHDRAWN: { label: "Withdrawn", variant: "secondary", group: "Closed" },
  ROLE_CLOSED: { label: "Role Closed", variant: "secondary", group: "Closed" },
  GHOSTED: { label: "Ghosted", variant: "destructive", group: "Closed" },
};

export const KANBAN_COLUMNS = [
  "To Apply",
  "Referral Requested",
  "Applied",
  "Under Review",
  "Interviewing",
  "Offer",
  "Closed",
] as const;

export const PRIORITY_META: Record<Priority, { label: string; variant: BadgeVariant }> = {
  HIGH: { label: "High", variant: "destructive" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "secondary" },
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
  UNKNOWN: "Unknown",
};

export const SOURCE_LABEL: Record<Source, string> = {
  LINKEDIN: "LinkedIn",
  COMPANY_SITE: "Company Site",
  JOB_BOARD: "Job Board",
  REFERRAL_TIP: "Referral Tip",
  RECRUITER: "Recruiter",
  FRIEND: "Friend",
  OTHER: "Other",
};

export const ALL_STATUSES = Object.keys(STATUS_META) as ApplicationStatus[];
