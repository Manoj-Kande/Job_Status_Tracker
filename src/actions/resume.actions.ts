"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const resumeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  fileUrl: z.string().trim().url("Enter a valid URL"),
  notes: z.string().max(2000).optional(),
  jobApplicationId: z.string().trim().optional().nullable(),
});

export type ResumeFormInput = z.input<typeof resumeSchema>;

export async function createResume(input: ResumeFormInput) {
  const user = await requireUser();
  const data = resumeSchema.parse(input);

  const resume = await prisma.resumeVersion.create({
    data: {
      userId: user.id,
      name: data.name,
      fileUrl: data.fileUrl,
      notes: data.notes,
    },
  });

  // Optionally link this new resume straight to a job application, so the
  // user doesn't have to separately visit the job's Application tab.
  if (data.jobApplicationId) {
    const job = await prisma.jobApplication.findFirst({
      where: { id: data.jobApplicationId, userId: user.id },
    });
    if (job) {
      await prisma.jobApplication.update({
        where: { id: job.id },
        data: { resumeVersionId: resume.id },
      });
      revalidatePath(`/applications/${job.id}`);
      revalidatePath("/applications");
    }
  }

  revalidatePath("/resumes");
  revalidateTag(`resumes-data-${user.id}`, "max");
  return resume;
}

/** Lightweight resume list for pickers (job list, kanban "attach resume" dialogs). */
export async function getResumeOptions() {
  const user = await requireUser();
  return prisma.resumeVersion.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, fileUrl: true },
  });
}

/** Link (or unlink, when resumeVersionId is null) a resume to a job application. */
export async function linkResumeToJob(jobApplicationId: string, resumeVersionId: string | null) {
  const user = await requireUser();
  const job = await prisma.jobApplication.findFirst({ where: { id: jobApplicationId, userId: user.id } });
  if (!job) throw new Error("NOT_FOUND");

  if (resumeVersionId) {
    const resume = await prisma.resumeVersion.findFirst({ where: { id: resumeVersionId, userId: user.id } });
    if (!resume) throw new Error("NOT_FOUND");
  }

  const updated = await prisma.jobApplication.update({
    where: { id: jobApplicationId },
    data: { resumeVersionId },
  });

  revalidatePath("/applications");
  revalidatePath(`/applications/${jobApplicationId}`);
  revalidatePath("/resumes");
  revalidateTag(`resumes-data-${user.id}`, "max");
  return updated;
}

export async function updateResume(id: string, input: Partial<ResumeFormInput>) {
  const user = await requireUser();
  const existing = await prisma.resumeVersion.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  const { jobApplicationId: _jobApplicationId, ...data } = resumeSchema.partial().parse(input);
  void _jobApplicationId;

  const resume = await prisma.resumeVersion.update({
    where: { id },
    data,
  });

  revalidatePath("/resumes");
  revalidateTag(`resumes-data-${user.id}`, "max");
  return resume;
}

export async function deleteResume(id: string) {
  const user = await requireUser();
  const existing = await prisma.resumeVersion.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.resumeVersion.delete({ where: { id } });

  revalidatePath("/resumes");
  revalidateTag(`resumes-data-${user.id}`, "max");
  return { success: true };
}
