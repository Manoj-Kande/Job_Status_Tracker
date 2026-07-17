import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { startOfDay, endOfDay, endOfWeek } from "date-fns";

const followUpInclude = { jobApplication: { select: { id: true, companyName: true, jobTitle: true } } } as const;

/** Inferred straight from the query below instead of hand-typed, so it can
 *  never drift out of sync with the fields callers (FollowUpCard, etc.)
 *  actually need — unlike a manually written subset type would. */
type FollowUpRow = Awaited<ReturnType<typeof prisma.followUp.findMany<{ include: typeof followUpInclude }>>>[number];

/**
 * The old version ran 6 separate findMany calls — one per bucket, plus a
 * 6th "all incomplete" query that was really just the union of the first
 * four (today/thisWeek/upcoming/overdue always sum to "all incomplete"),
 * so every incomplete follow-up round-tripped from the DB twice. This
 * fetches each row exactly once (incomplete + completed, 2 queries total)
 * and buckets by date in memory instead. Cached per-user, invalidated via
 * revalidateTag(`jobs-data-${userId}`) from followup/job actions.
 */
export async function getFollowUpBuckets() {
  const user = await getCurrentUser();
  if (!user) return { today: [], thisWeek: [], upcoming: [], overdue: [], completed: [], all: [] };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);
  const dayKey = todayStart.toISOString().slice(0, 10);

  const base = { jobApplication: { userId: user.id, archived: false } } as const;

  const [all, completed] = await unstable_cache(
    () =>
      Promise.all([
        prisma.followUp.findMany({
          where: { ...base, completed: false },
          include: followUpInclude,
          orderBy: { followUpDate: "asc" },
        }),
        prisma.followUp.findMany({
          where: { ...base, completed: true },
          include: followUpInclude,
          orderBy: { completedAt: "desc" },
          take: 50,
        }),
      ]),
    ["followup-buckets", user.id, dayKey],
    { tags: [`jobs-data-${user.id}`], revalidate: 60 }
  )();

  const today: FollowUpRow[] = [];
  const thisWeek: FollowUpRow[] = [];
  const upcoming: FollowUpRow[] = [];
  const overdue: FollowUpRow[] = [];

  for (const f of all) {
    const d = new Date(f.followUpDate);
    if (d < todayStart) overdue.push(f);
    else if (d <= todayEnd) today.push(f);
    else if (d <= weekEnd) thisWeek.push(f);
    else upcoming.push(f);
  }

  return { today, thisWeek, upcoming, overdue, completed, all };
}
