import "server-only";
import { unstable_cache } from "next/cache";
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

/** Cached per-user, invalidated via revalidateTag(`resumes-data-${userId}`) from resume.actions.ts. */
export async function getResumes() {
  const user = await getCurrentUser();
  if (!user) return [];

  return unstable_cache(
    () =>
      prisma.resumeVersion.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          jobApplications: {
            where: { archived: false },
            orderBy: { updatedAt: "desc" },
            select: { id: true, companyName: true, jobTitle: true, applicationStatus: true },
          },
        },
      }),
    ["resumes-list", user.id],
    { tags: [`resumes-data-${user.id}`], revalidate: 300 }
  )();
}
