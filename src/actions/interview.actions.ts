"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { InterviewOutcome, InterviewType } from "@prisma/client";

async function assertOwnsJob(jobApplicationId: string) {
  const user = await requireUser();
  const job = await prisma.jobApplication.findFirst({ where: { id: jobApplicationId, userId: user.id } });
  if (!job) throw new Error("NOT_FOUND");
  return job;
}

async function assertOwnsRound(id: string) {
  const user = await requireUser();
  const round = await prisma.interviewRound.findFirst({
    where: { id, jobApplication: { userId: user.id } },
  });
  if (!round) throw new Error("NOT_FOUND");
  return round;
}

export async function createInterviewRound(
  jobApplicationId: string,
  input: {
    roundName: string;
    roundNumber: number;
    interviewType: InterviewType;
    interviewDateTime?: Date;
    interviewerNames?: string;
    notes?: string;
  }
) {
  const job = await assertOwnsJob(jobApplicationId);
  const round = await prisma.interviewRound.create({ data: { jobApplicationId, ...input } });

  await prisma.jobApplication.update({
    where: { id: jobApplicationId },
    data: {
      statusHistory: {
        create: {
          previousStatus: job.applicationStatus,
          newStatus: job.applicationStatus,
          eventType: "INTERVIEW_ADDED",
          notes: input.roundName,
        },
      },
    },
  });

  revalidatePath(`/applications/${jobApplicationId}`);
  return round;
}

export async function updateInterviewRound(
  id: string,
  input: Partial<{
    roundName: string;
    interviewDateTime: Date;
    interviewerNames: string;
    notes: string;
    topicsDiscussed: string;
    outcome: InterviewOutcome;
    nextActionDate: Date;
  }>
) {
  const round = await assertOwnsRound(id);
  const updated = await prisma.interviewRound.update({ where: { id }, data: input });

  revalidatePath(`/applications/${round.jobApplicationId}`);
  return updated;
}
