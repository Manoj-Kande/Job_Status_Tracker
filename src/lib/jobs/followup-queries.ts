import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { startOfDay, endOfDay, endOfWeek } from "date-fns";

export async function getFollowUpBuckets() {
  const user = await getCurrentUser();
  if (!user) return { today: [], thisWeek: [], upcoming: [], overdue: [], completed: [], all: [] };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  const base = { jobApplication: { userId: user.id, archived: false } } as const;
  const include = { jobApplication: { select: { id: true, companyName: true, jobTitle: true } } } as const;

  const [today, thisWeek, upcoming, overdue, completed, all] = await Promise.all([
    prisma.followUp.findMany({
      where: { ...base, completed: false, followUpDate: { gte: todayStart, lte: todayEnd } },
      include,
      orderBy: { followUpDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { ...base, completed: false, followUpDate: { gt: todayEnd, lte: weekEnd } },
      include,
      orderBy: { followUpDate: "asc" },
    }),
    // Anything scheduled beyond the current calendar week — without this
    // bucket, follow-ups dated further out than "this week" never showed
    // up anywhere on the Follow-ups page.
    prisma.followUp.findMany({
      where: { ...base, completed: false, followUpDate: { gt: weekEnd } },
      include,
      orderBy: { followUpDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { ...base, completed: false, followUpDate: { lt: todayStart } },
      include,
      orderBy: { followUpDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { ...base, completed: true },
      include,
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    prisma.followUp.findMany({
      where: { ...base, completed: false },
      include,
      orderBy: { followUpDate: "asc" },
    }),
  ]);

  return { today, thisWeek, upcoming, overdue, completed, all };
}
