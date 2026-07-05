import { z } from "zod";

/**
 * Date-only fields come from <input type="date"> as "YYYY-MM-DD" strings.
 * z.coerce.date() alone parses those as UTC midnight, which can render as
 * the previous day in timezones behind UTC. This preprocesses plain
 * "YYYY-MM-DD" strings into a local-midnight Date first.
 */
const dateOnly = z.preprocess((val) => {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return val;
}, z.coerce.date());

export const jobFormSchema = z.object({
  // Required (Quick Add)
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  jobTitle: z.string().trim().min(1, "Job title is required").max(200),
  jobPostingUrl: z.union([z.literal(""), z.string().url("Enter a valid URL")]).optional(),
  dateDiscovered: dateOnly,
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  savedForLater: z.boolean().default(false),

  // Job details
  location: z.string().max(200).optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).default("UNKNOWN"),
  source: z
    .enum(["LINKEDIN", "COMPANY_SITE", "JOB_BOARD", "REFERRAL_TIP", "RECRUITER", "FRIEND", "OTHER"])
    .default("OTHER"),
  descriptionNotes: z.string().max(5000).optional(),
  applicationDeadline: dateOnly.optional().nullable(),
  salaryRange: z.string().max(100).optional(),
  jobType: z
    .enum(["FULL_TIME", "INTERNSHIP", "CONTRACT", "PART_TIME", "OTHER"])
    .default("FULL_TIME"),

  // Application details
  dateApplied: dateOnly.optional().nullable(),
  appliedVia: z
    .enum(["REFERRAL", "COMPANY_SITE", "LINKEDIN_EASY_APPLY", "JOB_BOARD", "EMAIL", "RECRUITER", "OTHER"])
    .optional(),
  resumeVersionUsed: z.string().max(200).optional(),
  resumeVersionId: z.string().optional().nullable(),
  coverLetterUsed: z.boolean().default(false),
  coverLetterVersion: z.string().max(200).optional(),
  recruiterName: z.string().max(200).optional(),
  recruiterEmail: z.union([z.literal(""), z.string().email()]).optional(),
  recruiterLinkedInUrl: z.union([z.literal(""), z.string().url()]).optional(),

  // Follow-up details
  nextFollowUpDate: dateOnly.optional().nullable(),
  reminderNotes: z.string().max(2000).optional(),
});

export type JobFormInput = z.input<typeof jobFormSchema>;
export type JobFormOutput = z.output<typeof jobFormSchema>;

/**
 * Deliberately minimal — Quick Add is a fast-capture flow, not the full
 * form. Nothing here is required; company name and job title get sane
 * placeholders server-side if left blank, and everything else (location,
 * salary, notes, recruiter info, etc.) is filled in later from the job's
 * edit drawer once it's sitting in the queue or the pipeline.
 */
export const quickAddSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  jobPostingUrl: z.union([z.literal(""), z.string().url("Enter a valid URL")]).optional(),
  savedForLater: z.boolean().default(false),
  // Optional extras, revealed behind "Add more details" in Quick Add.
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  location: z.string().max(200).optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).optional(),
  source: z
    .enum(["LINKEDIN", "COMPANY_SITE", "JOB_BOARD", "REFERRAL_TIP", "RECRUITER", "FRIEND", "OTHER"])
    .optional(),
  applicationDeadline: dateOnly.optional().nullable(),
  salaryRange: z.string().max(100).optional(),
  descriptionNotes: z.string().max(5000).optional(),
});
export type QuickAddInput = z.input<typeof quickAddSchema>;
