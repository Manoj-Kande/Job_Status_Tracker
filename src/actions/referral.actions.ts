"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { ReferralStatus } from "@prisma/client";

async function assertOwnsJob(jobApplicationId: string) {
  const user = await requireUser();
  const job = await prisma.jobApplication.findFirst({ where: { id: jobApplicationId, userId: user.id } });
  if (!job) throw new Error("NOT_FOUND");
  return job;
}

export async function createReferral(
  jobApplicationId: string,
  input: {
    contactName: string;
    contactRelation?: string;
    contactEmail?: string;
    contactLinkedInUrl?: string;
    referralStatus?: ReferralStatus;
    notes?: string;
  }
) {
  await assertOwnsJob(jobApplicationId);

  const referral = await prisma.referral.create({
    data: { jobApplicationId, referralStatus: input.referralStatus ?? "NOT_ASKED", ...input },
  });

  revalidatePath(`/applications/${jobApplicationId}`);
  return referral;
}

export async function updateReferral(
  id: string,
  jobApplicationId: string,
  input: Partial<{
    contactName: string;
    contactRelation: string;
    contactEmail: string;
    contactLinkedInUrl: string;
    referralStatus: ReferralStatus;
    referralAskDate: Date;
    referralSubmittedDate: Date;
    referralFollowUpDate: Date;
    notes: string;
  }>
) {
  await assertOwnsJob(jobApplicationId);
  const referral = await prisma.referral.update({ where: { id }, data: input });
  revalidatePath(`/applications/${jobApplicationId}`);
  return referral;
}

export async function deleteReferral(id: string, jobApplicationId: string) {
  await assertOwnsJob(jobApplicationId);
  await prisma.referral.delete({ where: { id } });
  revalidatePath(`/applications/${jobApplicationId}`);
  return { success: true };
}
