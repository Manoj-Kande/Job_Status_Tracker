"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { FollowUpType } from "@prisma/client";

async function assertOwnsJob(jobApplicationId: string) {
  const user = await requireUser();
  const job = await prisma.jobApplication.findFirst({ where: { id: jobApplicationId, userId: user.id } });
  if (!job) throw new Error("NOT_FOUND");
  return job;
}

async function assertOwnsFollowUp(id: string) {
  const user = await requireUser();
  const followUp = await prisma.followUp.findFirst({
    where: { id, jobApplication: { userId: user.id } },
    include: { jobApplication: true },
  });
  if (!followUp) throw new Error("NOT_FOUND");
  return followUp;
}

export async function createFollowUp(
  jobApplicationId: string,
  input: { followUpDate: Date; followUpType: FollowUpType; reminderNotes?: string }
) {
  await assertOwnsJob(jobApplicationId);
  const followUp = await prisma.followUp.create({ data: { jobApplicationId, ...input } });

  revalidatePath(`/applications/${jobApplicationId}`);
  revalidatePath("/follow-ups");
  return followUp;
}

export async function completeFollowUp(id: string, outcomeNotes?: string) {
  const followUp = await assertOwnsFollowUp(id);
  const updated = await prisma.followUp.update({
    where: { id },
    data: { completed: true, completedAt: new Date(), outcomeNotes },
  });

  revalidatePath(`/applications/${followUp.jobApplicationId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return updated;
}

export async function rescheduleFollowUp(id: string, followUpDate: Date) {
  const followUp = await assertOwnsFollowUp(id);
  const updated = await prisma.followUp.update({
    where: { id },
    data: { followUpDate, completed: false, completedAt: null },
  });

  revalidatePath(`/applications/${followUp.jobApplicationId}`);
  revalidatePath("/follow-ups");
  return updated;
}

export async function updateFollowUp(
  id: string,
  input: { followUpDate: Date; followUpType: FollowUpType; reminderNotes?: string | null }
) {
  const followUp = await assertOwnsFollowUp(id);
  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      followUpDate: input.followUpDate,
      followUpType: input.followUpType,
      reminderNotes: input.reminderNotes ?? undefined,
    },
  });

  revalidatePath(`/applications/${followUp.jobApplicationId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteFollowUp(id: string) {
  const followUp = await assertOwnsFollowUp(id);
  await prisma.followUp.delete({ where: { id } });

  revalidatePath(`/applications/${followUp.jobApplicationId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return { success: true };
}
