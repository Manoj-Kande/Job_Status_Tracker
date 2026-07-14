import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ReferralContactStatus } from "@prisma/client";

/**
 * Default card→status mapping for brand-new users, expressed as built-in
 * status labels (resolved to real status ids at seed time, once those
 * statuses exist). Mirrors the original design mockup's three buckets.
 */
const DEFAULT_STAT_CARDS: { label: string; statusLabels: string[] }[] = [
  { label: "Ready to ask", statusLabels: ["Can Ask Referral"] },
  { label: "Waiting to hear back", statusLabels: ["Already Asked", "Follow Up Later"] },
  { label: "Positive responses", statusLabels: ["Positive Response"] },
];

/**
 * Lazily seeds a user's default stat cards the first time they touch this
 * feature, same pattern as ensureDefaultStatuses. Needs the user's actual
 * status rows (not just labels) so it can store real status ids.
 */
export async function ensureDefaultStatCards(userId: string, statuses: ReferralContactStatus[]) {
  const existing = await prisma.referralStatCard.findMany({ where: { userId } });
  if (existing.length > 0) return existing;

  const byLabel = new Map(statuses.map((s) => [s.label, s.id]));
  const data = DEFAULT_STAT_CARDS.map((card, i) => ({
    userId,
    label: card.label,
    statusIds: card.statusLabels.map((l) => byLabel.get(l)).filter((id): id is string => !!id),
    sortOrder: i,
  })).filter((card) => card.statusIds.length > 0);

  if (data.length === 0) return [];

  await prisma.referralStatCard.createMany({ data });
  return prisma.referralStatCard.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
}

/**
 * Cached per-user, same as getReferralStatuses — cards change rarely
 * (a handful of edits ever) compared to how often the stat strip renders.
 * Invalidated via revalidateTag when a card is created/edited/deleted/
 * reordered (see referral-stat-card.actions.ts).
 */
export async function getReferralStatCards(userId: string, statuses: ReferralContactStatus[]) {
  await ensureDefaultStatCards(userId, statuses);
  return unstable_cache(
    async () => prisma.referralStatCard.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    ["referral-stat-cards", userId],
    { tags: [`referral-stat-cards-${userId}`] }
  )();
}
