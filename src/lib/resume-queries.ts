import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Minimal, non-archived job list used by the resume-link search combobox. */
export async function getJobOptionsForLinking() {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.jobApplication.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { updatedAt: "desc" },
    select: { id: true, companyName: true, jobTitle: true },
  });
}

export async function getResumes() {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.resumeVersion.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      jobApplications: {
        where: { archived: false },
        orderBy: { updatedAt: "desc" },
        select: { id: true, companyName: true, jobTitle: true, applicationStatus: true },
      },
    },
  });
}
