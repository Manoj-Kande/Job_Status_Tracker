"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export interface JobSearchResult {
  kind: "job";
  id: string;
  companyName: string;
  jobTitle: string;
  applicationStatus: string;
  archived: boolean;
}

export interface ResumeSearchResult {
  kind: "resume";
  id: string;
  name: string;
  fileUrl: string;
}

export async function globalSearch(query: string): Promise<{ jobs: JobSearchResult[]; resumes: ResumeSearchResult[] }> {
  const user = await requireUser();
  const q = query.trim();
  if (!q) return { jobs: [], resumes: [] };

  const [jobs, resumes] = await Promise.all([
    prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { jobTitle: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, companyName: true, jobTitle: true, applicationStatus: true, archived: true },
    }),
    prisma.resumeVersion.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, name: true, fileUrl: true },
    }),
  ]);

  return {
    jobs: jobs.map((j) => ({ kind: "job" as const, ...j })),
    resumes: resumes.map((r) => ({ kind: "resume" as const, ...r })),
  };
}
