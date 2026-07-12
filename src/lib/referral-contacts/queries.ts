import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_REFERRAL_STATUSES } from "@/lib/referral-contacts/status-meta";

/**
 * Upper bound on how many contacts we ever pull in one request. Search,
 * sort, status-filter, and pagination all happen client-side (see
 * ReferralContactsView) against this one array, so there's exactly one
 * DB round trip no matter how the user filters/sorts/pages afterwards —
 * that's the whole point. This cap just guards against an unbounded
 * query if a single user somehow accumulates an enormous list.
 */
const MAX_CONTACTS = 2000;

/**
 * Lazily seeds a user's built-in statuses the first time they touch this
 * feature, instead of a one-off migration script — keeps new users and
 * users who signed up before this feature existed on the same path.
 */
export async function ensureDefaultStatuses(userId: string) {
  const existing = await prisma.referralContactStatus.findMany({ where: { userId } });
  if (existing.length > 0) return existing;

  await prisma.referralContactStatus.createMany({
    data: DEFAULT_REFERRAL_STATUSES.map((label, i) => ({
      userId,
      label,
      isCustom: false,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });

  return prisma.referralContactStatus.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
}

/**
 * Statuses change rarely (add/rename/delete a handful of times ever) compared
 * to how often they're read (every render of this page), so they're cached
 * per-user across requests and only invalidated via revalidateTag when a
 * status is created/renamed/deleted (see referral-contact.actions.ts).
 */
export async function getReferralStatuses(userId: string) {
  await ensureDefaultStatuses(userId);
  return unstable_cache(
    async () =>
      prisma.referralContactStatus.findMany({
        where: { userId },
        orderBy: [{ isCustom: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ["referral-statuses", userId],
    { tags: [`referral-statuses-${userId}`] }
  )();
}

/**
 * Single query, single cache entry per user — the *only* read the contacts
 * page needs. Search, status filtering, sorting, and pagination are all
 * derived from this one array in the browser (see ReferralContactsView),
 * so switching a filter, changing sort, or flipping pages costs zero extra
 * network/DB round trips. Wrapped in unstable_cache and invalidated via
 * revalidateTag(`referral-contacts-${userId}`) whenever any mutation
 * touches this user's contacts, so a stale read is never served after a
 * write (see referral-contact.actions.ts).
 */
export async function listReferralContacts(userId: string) {
  return unstable_cache(
    async () =>
      prisma.referralContact.findMany({
        where: { userId },
        include: { status: true, jobApplication: { select: { id: true, companyName: true, jobTitle: true } } },
        orderBy: [{ company: "asc" }, { fullName: "asc" }],
        take: MAX_CONTACTS,
      }),
    ["referral-contacts-list", userId],
    { tags: [`referral-contacts-${userId}`] }
  )();
}

export async function findDuplicateContact(userId: string, fullName: string, company: string, excludeId?: string) {
  return prisma.referralContact.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      fullName: { equals: fullName, mode: "insensitive" },
      company: { equals: company, mode: "insensitive" },
    },
  });
}

/** Separate from name+company matching: catches re-pasting the same profile under a typo'd name. */
export async function findDuplicateLinkedInUrl(userId: string, linkedInUrl: string, excludeId?: string) {
  const normalize = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
  const target = normalize(linkedInUrl);
  const candidates = await prisma.referralContact.findMany({
    where: { userId, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true, linkedInUrl: true, fullName: true },
  });
  return candidates.find((c) => normalize(c.linkedInUrl) === target) ?? null;
}

/** Contacts with a follow-up date today or earlier — powers the dashboard widget. */
export async function getUpcomingReferralFollowUps(userId: string, limit = 5) {
  return unstable_cache(
    async () =>
      prisma.referralContact.findMany({
        where: { userId, nextFollowUpDate: { lte: new Date() } },
        orderBy: { nextFollowUpDate: "asc" },
        take: limit,
      }),
    ["referral-contacts-followups", userId, String(limit)],
    { tags: [`referral-contacts-${userId}`], revalidate: 300 }
  )();
}

/** For the "link to job application" picker in the contact form. Left
 * uncached (unlike everything above) since job applications are created/
 * archived from a different part of the app — caching it here without a
 * matching revalidateTag hook elsewhere risks showing a stale list. It's a
 * single lightweight select, so the cost of not caching it is negligible. */
export async function listJobApplicationsForLinking(userId: string) {
  return prisma.jobApplication.findMany({
    where: { userId, archived: false },
    select: { id: true, companyName: true, jobTitle: true },
    orderBy: { companyName: "asc" },
  });
}
