"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jobFormSchema, quickAddSchema, type JobFormInput, type QuickAddInput } from "@/lib/validations/job.schema";
import { suggestFollowUpDate } from "@/lib/stale";
import { findLikelyDuplicate } from "@/lib/jobs/queries";

function emptyToUndefined(v?: string) {
  return v === "" ? undefined : v;
}

export async function checkDuplicateJob(companyName: string, jobTitle: string, excludeId?: string) {
  const dup = await findLikelyDuplicate(companyName, jobTitle, excludeId);
  return { isDuplicate: !!dup, existingId: dup?.id ?? null };
}

/**
 * Fast-capture path used by Quick Add. Nothing is required — a blank
 * company name / job title get placeholders so the record is still
 * useful to click into and fill out later from the queue or list view.
 */
export async function quickAddJob(input: QuickAddInput) {
  const user = await requireUser();
  const data = quickAddSchema.parse(input);
  const companyName = data.companyName?.trim() || "Untitled company";

  const job = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      companyName,
      jobTitle: "Untitled role",
      jobPostingUrl: emptyToUndefined(data.jobPostingUrl),
      dateDiscovered: new Date(),
      priority: data.priority ?? "MEDIUM",
      location: data.location,
      workMode: data.workMode ?? "UNKNOWN",
      source: data.source ?? "OTHER",
      applicationDeadline: data.applicationDeadline ?? undefined,
      salaryRange: data.salaryRange,
      descriptionNotes: data.descriptionNotes,
      applicationStatus: "TO_APPLY",
      savedForLater: data.savedForLater,
      statusHistory: {
        create: {
          newStatus: "TO_APPLY",
          eventType: "CREATED",
          notes: data.savedForLater ? "Job saved to queue (quick add)" : "Job added (quick add)",
        },
      },
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  revalidatePath("/later");
  return job;
}

export async function createJob(input: JobFormInput) {
  const user = await requireUser();
  const data = jobFormSchema.parse(input);

  const job = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      jobPostingUrl: emptyToUndefined(data.jobPostingUrl),
      dateDiscovered: data.dateDiscovered,
      priority: data.priority,
      location: data.location,
      workMode: data.workMode,
      source: data.source,
      descriptionNotes: data.descriptionNotes,
      applicationDeadline: data.applicationDeadline ?? undefined,
      salaryRange: data.salaryRange,
      jobType: data.jobType,
      dateApplied: data.dateApplied ?? undefined,
      appliedVia: data.appliedVia,
      resumeVersionUsed: data.resumeVersionUsed,
      resumeVersionId: data.resumeVersionId ?? undefined,
      coverLetterUsed: data.coverLetterUsed,
      coverLetterVersion: data.coverLetterVersion,
      recruiterName: data.recruiterName,
      recruiterEmail: emptyToUndefined(data.recruiterEmail),
      recruiterLinkedInUrl: emptyToUndefined(data.recruiterLinkedInUrl),
      nextFollowUpDate: data.nextFollowUpDate ?? undefined,
      reminderNotes: data.reminderNotes,
      applicationStatus: "TO_APPLY",
      savedForLater: data.savedForLater ?? false,
      statusHistory: {
        create: {
          newStatus: "TO_APPLY",
          eventType: "CREATED",
          notes: data.savedForLater ? "Job saved to queue" : "Job added",
        },
      },
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  revalidatePath("/later");
  return job;
}

export async function updateJob(id: string, input: Partial<JobFormInput>) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const data = jobFormSchema.partial().parse(input);

  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...data,
      jobPostingUrl: data.jobPostingUrl !== undefined ? emptyToUndefined(data.jobPostingUrl) : undefined,
      recruiterEmail: data.recruiterEmail !== undefined ? emptyToUndefined(data.recruiterEmail) : undefined,
      recruiterLinkedInUrl:
        data.recruiterLinkedInUrl !== undefined ? emptyToUndefined(data.recruiterLinkedInUrl) : undefined,
    },
  });

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  return job;
}

export async function updateJobStatus(id: string, newStatus: ApplicationStatus, notes?: string) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const suggestedFollowUp = suggestFollowUpDate(newStatus);

  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      applicationStatus: newStatus,
      ...(newStatus === "APPLIED_DIRECT" || newStatus === "APPLIED_REFERRAL"
        ? { dateApplied: existing.dateApplied ?? new Date() }
        : {}),
      ...(suggestedFollowUp ? { nextFollowUpDate: suggestedFollowUp } : {}),
      statusHistory: {
        create: {
          previousStatus: existing.applicationStatus,
          newStatus,
          eventType: "STATUS_CHANGE",
          notes,
        },
      },
      ...(suggestedFollowUp
        ? {
            followUps: {
              create: {
                followUpDate: suggestedFollowUp,
                followUpType: newStatus === "REFERRAL_REQUESTED" ? "REFERRAL" : "APPLICATION",
                reminderNotes: "Auto-suggested follow-up",
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  revalidatePath("/follow-ups");
  return job;
}

export async function archiveJob(id: string, archived = true) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      archived,
      statusHistory: {
        create: {
          previousStatus: existing.applicationStatus,
          newStatus: existing.applicationStatus,
          eventType: archived ? "ARCHIVED" : "UNARCHIVED",
        },
      },
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  return job;
}

/**
 * Moves a job out of the "save for later" queue and into the active pipeline
 * by marking it applied. Sets dateApplied (if not already set), records the
 * status change, and clears the queue flag so it now shows up on the kanban
 * board / applications list.
 */
export async function applyFromQueue(id: string, appliedVia?: JobFormInput["appliedVia"]) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const suggestedFollowUp = suggestFollowUpDate("APPLIED_DIRECT");

  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      savedForLater: false,
      applicationStatus: "APPLIED_DIRECT",
      dateApplied: existing.dateApplied ?? new Date(),
      appliedVia: appliedVia ?? existing.appliedVia ?? undefined,
      ...(suggestedFollowUp ? { nextFollowUpDate: suggestedFollowUp } : {}),
      statusHistory: {
        create: {
          previousStatus: existing.applicationStatus,
          newStatus: "APPLIED_DIRECT",
          eventType: "STATUS_CHANGE",
          notes: "Moved from queue and marked applied",
        },
      },
      ...(suggestedFollowUp
        ? {
            followUps: {
              create: {
                followUpDate: suggestedFollowUp,
                followUpType: "APPLICATION",
                reminderNotes: "Auto-suggested follow-up",
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/later");
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  revalidatePath("/follow-ups");
  return job;
}

/** Sends a job back to the "save for later" queue, out of the active pipeline. */
export async function moveToQueue(id: string) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      savedForLater: true,
      statusHistory: {
        create: {
          previousStatus: existing.applicationStatus,
          newStatus: existing.applicationStatus,
          eventType: "MOVED_TO_QUEUE",
          notes: "Moved back to save-for-later queue",
        },
      },
    },
  });

  revalidatePath("/later");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  return job;
}

export async function deleteJob(id: string) {
  const user = await requireUser();
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.jobApplication.delete({ where: { id } });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidateTag(`jobs-data-${user.id}`, "max");
  return { success: true };
}
