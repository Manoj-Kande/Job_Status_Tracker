import { z } from "zod";

export const referralContactFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  company: z.string().trim().min(1, "Company is required").max(200),
  linkedInUrl: z
    .string()
    .trim()
    .min(1, "LinkedIn URL is required")
    .refine((v) => /linkedin\.com/i.test(v), "Enter a valid LinkedIn profile URL"),
  jobTitle: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(3000).optional(),
  statusId: z.string().min(1, "Status is required"),
  nextFollowUpDate: z.string().trim().optional(),
  jobApplicationId: z.string().trim().optional(),
});

export type ReferralContactFormInput = z.input<typeof referralContactFormSchema>;
export type ReferralContactFormOutput = z.output<typeof referralContactFormSchema>;

export const bulkAddLinksSchema = z.object({
  links: z
    .string()
    .trim()
    .min(1, "Paste at least one LinkedIn link"),
});

export const customStatusSchema = z.object({
  label: z.string().trim().min(1, "Status name is required").max(60),
});
