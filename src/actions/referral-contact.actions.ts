"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { referralContactFormSchema, type ReferralContactFormInput } from "@/lib/validations/referral-contact.schema";
import { ensureDefaultStatuses, findDuplicateContact, findDuplicateLinkedInUrl } from "@/lib/referral-contacts/queries";
import { guessNameFromLinkedInUrl } from "@/lib/referral-contacts/name-from-linkedin";

function parseFollowUpDate(v?: string) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const PATH = "/referral-contacts";

async function nextRank(userId: string) {
  const last = await prisma.referralContact.findFirst({ where: { userId }, orderBy: { rank: "desc" } });
  return (last?.rank ?? 0) + 1;
}

/** A left-blank name defaults to a guess from the LinkedIn URL (and gets
 *  flagged Incomplete so it's easy to find and confirm later); a typed
 *  name is trusted as-is and marked complete. Shared by create, update,
 *  and the one-time backfill for older stub contacts below. */
function resolveName(typedName: string, linkedInUrl: string): { fullName: string; isIncomplete: boolean } {
  const trimmed = typedName.trim();
  if (trimmed) return { fullName: trimmed, isIncomplete: false };
  return { fullName: guessNameFromLinkedInUrl(linkedInUrl) ?? "Unnamed Contact", isIncomplete: true };
}

// ---------- Contact CRUD ----------

export async function createReferralContact(
  input: ReferralContactFormInput,
  opts: { allowDuplicate?: boolean } = {}
) {
  const user = await requireUser();
  const data = referralContactFormSchema.parse(input);
  const { fullName, isIncomplete } = resolveName(data.fullName, data.linkedInUrl);

  if (!opts.allowDuplicate) {
    const dupName = await findDuplicateContact(user.id, fullName, data.company);
    const dupLinkedIn = await findDuplicateLinkedInUrl(user.id, data.linkedInUrl, data.company);
    if (dupName) return { duplicate: true as const, reason: "name" as const, existingId: dupName.id };
    if (dupLinkedIn) return { duplicate: true as const, reason: "linkedin" as const, existingId: dupLinkedIn.id };
  }

  const contact = await prisma.referralContact.create({
    data: {
      userId: user.id,
      fullName,
      company: data.company,
      linkedInUrl: data.linkedInUrl,
      jobTitle: data.jobTitle || null,
      notes: data.notes || null,
      statusId: data.statusId,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      jobApplicationId: data.jobApplicationId || null,
      rank: await nextRank(user.id),
      isIncomplete,
    },
  });

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { duplicate: false as const, contact };
}

export async function updateReferralContact(id: string, input: ReferralContactFormInput) {
  const user = await requireUser();
  const data = referralContactFormSchema.parse(input);
  const { fullName, isIncomplete } = resolveName(data.fullName, data.linkedInUrl);

  const owned = await prisma.referralContact.findFirst({ where: { id, userId: user.id } });
  if (!owned) throw new Error("NOT_FOUND");

  const contact = await prisma.referralContact.update({
    where: { id },
    data: {
      fullName,
      company: data.company,
      linkedInUrl: data.linkedInUrl,
      jobTitle: data.jobTitle || null,
      notes: data.notes || null,
      statusId: data.statusId,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      jobApplicationId: data.jobApplicationId || null,
      isIncomplete,
    },
  });

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return contact;
}

// ---------- Review Names (fix old incomplete contacts) ----------
// Names are now extracted and written to the DB at the moment a contact is
// created (see resolveName() above) — this section exists only to let a
// user manually fix the older rows that predate that change, or any row
// where the LinkedIn slug genuinely couldn't produce a confident guess.
// Nothing here runs automatically; it's only ever called from the "Review
// Names" dialog, and every call is a real write, never a display-only filter.

export type NameUpdate = { id: string; fullName: string };
export type NameUpdateResult = { id: string; ok: boolean; error?: string };

/**
 * Applies confirmed names for one small batch of contacts at a time — the
 * Review Names UI calls this repeatedly (chunked) instead of one giant
 * request, so a list of hundreds updates progressively instead of the UI
 * hanging on a single long call. Each row is validated and written
 * independently so one bad id in a batch doesn't fail the whole batch;
 * the caller uses the per-id result to mark that row done or leave it
 * editable for retry.
 */
export async function updateContactNames(updates: NameUpdate[]): Promise<{ results: NameUpdateResult[] }> {
  const user = await requireUser();
  if (updates.length === 0) return { results: [] };

  const owned = await prisma.referralContact.findMany({
    where: { id: { in: updates.map((u) => u.id) }, userId: user.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((o) => o.id));

  const results: NameUpdateResult[] = [];
  for (const u of updates) {
    const trimmed = u.fullName.trim();
    if (!ownedIds.has(u.id)) {
      results.push({ id: u.id, ok: false, error: "Contact not found" });
      continue;
    }
    if (!trimmed) {
      results.push({ id: u.id, ok: false, error: "Name can't be empty" });
      continue;
    }
    try {
      await prisma.referralContact.update({
        where: { id: u.id },
        data: { fullName: trimmed, isIncomplete: false },
      });
      results.push({ id: u.id, ok: true });
    } catch {
      results.push({ id: u.id, ok: false, error: "Update failed" });
    }
  }

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { results };
}

export async function deleteReferralContact(id: string) {
  const user = await requireUser();
  await prisma.referralContact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { success: true };
}

// ---------- Ranking ----------

/** Batch-updates rank for a reordered list of contact ids (index 0 = rank 1). */
export async function reorderReferralContacts(orderedIds: string[]) {
  const user = await requireUser();
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.referralContact.updateMany({ where: { id, userId: user.id }, data: { rank: i + 1 } })
    )
  );
  revalidatePath(PATH);
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { success: true };
}

// ---------- Bulk add via pasted links ----------

export async function bulkAddReferralLinks(rawLinks: string, company: string = "") {
  const user = await requireUser();
  await ensureDefaultStatuses(user.id);

  const defaultStatus = await prisma.referralContactStatus.findFirst({
    where: { userId: user.id, isCustom: false },
    orderBy: { sortOrder: "asc" },
  });
  if (!defaultStatus) throw new Error("NO_DEFAULT_STATUS");

  const links = rawLinks
    .split(",")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /linkedin\.com/i.test(l));

  if (links.length === 0) return { added: 0, skipped: 0 };

  const trimmedCompany = company.trim();
  const normalize = (url: string) => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "").toLowerCase();

  // A company shouldn't end up with two rows for the same profile: dedupe
  // the pasted batch itself first (someone pastes the same link twice),
  // then drop anything that already exists for this exact company. The
  // same profile under a *different* company is a separate, legitimate
  // contact (e.g. they moved employers) and is left alone.
  const existing = await prisma.referralContact.findMany({
    where: { userId: user.id, company: { equals: trimmedCompany, mode: "insensitive" } },
    select: { linkedInUrl: true },
  });
  const existingKeys = new Set(existing.map((c) => normalize(c.linkedInUrl)));

  const seen = new Set<string>();
  const uniqueLinks: string[] = [];
  for (const link of links) {
    const key = normalize(link);
    if (seen.has(key) || existingKeys.has(key)) continue;
    seen.add(key);
    uniqueLinks.push(link);
  }

  const skipped = links.length - uniqueLinks.length;
  if (uniqueLinks.length === 0) return { added: 0, skipped };

  let rank = await nextRank(user.id);
  const rows = uniqueLinks.map((linkedInUrl) => ({
    userId: user.id,
    fullName: resolveName("", linkedInUrl).fullName,
    company: trimmedCompany,
    linkedInUrl,
    statusId: defaultStatus.id,
    isIncomplete: true,
    rank: rank++,
  }));

  await prisma.referralContact.createMany({ data: rows });
  revalidatePath(PATH);
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { added: rows.length, skipped };
}

// ---------- Custom statuses ----------

export async function createCustomStatus(label: string) {
  const user = await requireUser();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("EMPTY_LABEL");

  const status = await prisma.referralContactStatus.create({
    data: { userId: user.id, label: trimmed, isCustom: true, sortOrder: 999 },
  });
  revalidateTag(`referral-statuses-${user.id}`, "max");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  revalidatePath(PATH);
  return status;
}

export async function renameCustomStatus(id: string, label: string) {
  const user = await requireUser();
  const status = await prisma.referralContactStatus.findFirst({ where: { id, userId: user.id } });
  if (!status) throw new Error("NOT_FOUND");
  if (!status.isCustom) throw new Error("BUILTIN_LOCKED");

  const updated = await prisma.referralContactStatus.update({ where: { id }, data: { label: label.trim() } });
  revalidateTag(`referral-statuses-${user.id}`, "max");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  revalidatePath(PATH);
  return updated;
}

export async function deleteCustomStatus(id: string) {
  const user = await requireUser();
  const status = await prisma.referralContactStatus.findFirst({ where: { id, userId: user.id } });
  if (!status) throw new Error("NOT_FOUND");
  if (!status.isCustom) throw new Error("BUILTIN_LOCKED");

  const inUse = await prisma.referralContact.count({ where: { statusId: id } });
  if (inUse > 0) throw new Error("STATUS_IN_USE");

  await prisma.referralContactStatus.delete({ where: { id } });
  revalidateTag(`referral-statuses-${user.id}`, "max");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  revalidatePath(PATH);
  return { success: true };
}

// ---------- Activity log ----------

export async function listContactActivity(contactId: string) {
  const user = await requireUser();
  const owned = await prisma.referralContact.findFirst({ where: { id: contactId, userId: user.id } });
  if (!owned) throw new Error("NOT_FOUND");
  return prisma.referralContactActivity.findMany({ where: { contactId }, orderBy: { createdAt: "desc" } });
}

export async function addContactActivity(contactId: string, note: string) {
  const user = await requireUser();
  const trimmed = note.trim();
  if (!trimmed) throw new Error("EMPTY_NOTE");

  const owned = await prisma.referralContact.findFirst({ where: { id: contactId, userId: user.id } });
  if (!owned) throw new Error("NOT_FOUND");

  const entry = await prisma.referralContactActivity.create({ data: { contactId, note: trimmed } });
  revalidatePath(PATH);
  return entry;
}

// ---------- Reset status ----------
// Covers the "a friend imported my export and now wants to reset status"
// scenario: bulk-revert contacts back to the default (first built-in)
// status, scoped to everything, a single company, or a hand-picked set of
// contacts — without deleting or otherwise touching the contacts themselves.
// The list of companies to choose from is derived client-side from the
// already-loaded contact list (see ReferralContactsView), so there's no
// extra read here — this only ever performs the (write) reset itself.

export type ContactScope =
  | { scope: "all" }
  | { scope: "companies"; companies: string[] }
  | { scope: "ids"; ids: string[] };

/** @deprecated kept for backward compatibility — use ContactScope's "companies" variant instead. */
export type ResetStatusScope = ContactScope | { scope: "company"; company: string };

function scopeWhere(userId: string, input: ResetStatusScope) {
  if (input.scope === "all") return { userId };
  if (input.scope === "company") return { userId, company: { equals: input.company, mode: "insensitive" as const } };
  if (input.scope === "companies") {
    if (input.companies.length === 0) return { userId, id: "__none__" };
    return { userId, OR: input.companies.map((c) => ({ company: { equals: c, mode: "insensitive" as const } })) };
  }
  return { userId, id: { in: input.ids } };
}

export async function resetReferralContactStatuses(input: ResetStatusScope) {
  const user = await requireUser();

  const builtins = await prisma.referralContactStatus.findMany({
    where: { userId: user.id, isCustom: false },
    orderBy: { sortOrder: "asc" },
  });
  const defaultStatus = builtins[0];
  if (!defaultStatus) throw new Error("NO_DEFAULT_STATUS");

  const where = scopeWhere(user.id, input);
  const result = await prisma.referralContact.updateMany({ where, data: { statusId: defaultStatus.id } });

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { count: result.count, defaultStatusLabel: defaultStatus.label };
}

// ---------- Bulk delete ----------
// Mirrors resetReferralContactStatuses' scoping (all / one-or-more companies /
// a hand-picked set of ids), but permanently removes the matched contacts
// instead of just resetting their status.

export async function deleteReferralContacts(input: ContactScope) {
  const user = await requireUser();
  const where = scopeWhere(user.id, input);
  const result = await prisma.referralContact.deleteMany({ where });

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { count: result.count };
}

// ---------- CSV export ----------

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportReferralContactsCsv() {
  const user = await requireUser();
  const contacts = await prisma.referralContact.findMany({
    where: { userId: user.id },
    include: { status: true },
    orderBy: { company: "asc" },
  });

  const header = ["Full Name", "Company", "Job Title", "LinkedIn URL", "Status", "Notes", "Date Added", "Last Updated"];
  const rows = contacts.map((c) =>
    [
      c.fullName,
      c.company,
      c.jobTitle ?? "",
      c.linkedInUrl,
      c.status.label,
      c.notes ?? "",
      c.createdAt.toISOString().slice(0, 10),
      c.updatedAt.toISOString().slice(0, 10),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export async function exportReferralContacts() {
  const user = await requireUser();
  const [statuses, contacts] = await Promise.all([
    prisma.referralContactStatus.findMany({ where: { userId: user.id } }),
    prisma.referralContact.findMany({ where: { userId: user.id }, include: { status: true } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    statuses: statuses.map((s) => ({ label: s.label, isCustom: s.isCustom })),
    contacts: contacts.map((c) => ({
      fullName: c.fullName,
      company: c.company,
      linkedInUrl: c.linkedInUrl,
      jobTitle: c.jobTitle,
      notes: c.notes,
      status: c.status.label,
      isIncomplete: c.isIncomplete,
    })),
  };
}

type ImportPayload = {
  statuses?: { label: string; isCustom?: boolean }[];
  contacts: {
    fullName: string;
    company: string;
    linkedInUrl: string;
    jobTitle?: string | null;
    notes?: string | null;
    status?: string;
    isIncomplete?: boolean;
  }[];
};

/**
 * Copies contacts from another user's export into the *current* user's
 * account. Never touches the exporting user's data — this always inserts
 * fresh rows scoped to requireUser()'s id. Possible duplicates (same
 * name+company already present) are counted and flagged in the result
 * rather than blocked, matching the soft-warn behavior on manual Create.
 */
export async function importReferralContacts(payload: ImportPayload) {
  const user = await requireUser();
  await ensureDefaultStatuses(user.id);

  const existingStatuses = await prisma.referralContactStatus.findMany({ where: { userId: user.id } });
  const existingLabelsLower = new Set(existingStatuses.map((s) => s.label.toLowerCase()));

  const missingLabels = [...new Set((payload.statuses ?? []).map((s) => s.label).filter((l) => l && !existingLabelsLower.has(l.toLowerCase())))];
  if (missingLabels.length > 0) {
    await prisma.referralContactStatus.createMany({
      data: missingLabels.map((label) => ({ userId: user.id, label, isCustom: true, sortOrder: 999 })),
      skipDuplicates: true,
    });
  }

  // Single re-read (not one per label) now that any missing statuses exist.
  const allStatuses = missingLabels.length > 0
    ? await prisma.referralContactStatus.findMany({ where: { userId: user.id } })
    : existingStatuses;
  const defaultStatus = allStatuses.find((s) => !s.isCustom) ?? allStatuses[0];
  const statusByLabel = new Map(allStatuses.map((s) => [s.label.toLowerCase(), s]));

  // One read of this user's current (name, company) pairs to flag duplicates
  // in-memory, instead of a findFirst per incoming contact.
  const existingPairs = new Set(
    (await prisma.referralContact.findMany({ where: { userId: user.id }, select: { fullName: true, company: true } })).map(
      (c) => `${c.fullName.toLowerCase()}|${c.company.toLowerCase()}`
    )
  );

  let rank = await nextRank(user.id);
  let added = 0;
  let flagged = 0;
  const rows: Prisma.ReferralContactCreateManyInput[] = [];

  for (const c of payload.contacts) {
    if (!c.fullName || !c.company || !c.linkedInUrl) continue;

    const key = `${c.fullName.toLowerCase()}|${c.company.toLowerCase()}`;
    if (existingPairs.has(key)) flagged++;
    existingPairs.add(key); // catches duplicates *within* the pasted payload too

    const statusRow = statusByLabel.get((c.status ?? "").toLowerCase());
    rows.push({
      userId: user.id,
      fullName: c.fullName,
      company: c.company,
      linkedInUrl: c.linkedInUrl,
      jobTitle: c.jobTitle || null,
      notes: c.notes || null,
      statusId: (statusRow ?? defaultStatus).id,
      isIncomplete: !!c.isIncomplete,
      rank: rank++,
    });
    added++;
  }

  if (rows.length > 0) {
    await prisma.referralContact.createMany({ data: rows });
  }

  revalidateTag(`referral-statuses-${user.id}`, "max");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  revalidatePath(PATH);
  revalidatePath("/dashboard");
  return { added, flagged };
}
