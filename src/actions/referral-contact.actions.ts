http://localhost:3000/http://localhost:3000/"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { referralContactFormSchema, type ReferralContactFormInput } from "@/lib/validations/referral-contact.schema";
import { ensureDefaultStatuses, findDuplicateContact, findDuplicateLinkedInUrl } from "@/lib/referral-contacts/queries";

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

// ---------- Contact CRUD ----------

export async function createReferralContact(
  input: ReferralContactFormInput,
  opts: { allowDuplicate?: boolean } = {}
) {
  const user = await requireUser();
  const data = referralContactFormSchema.parse(input);

  if (!opts.allowDuplicate) {
    const dupName = await findDuplicateContact(user.id, data.fullName, data.company);
    const dupLinkedIn = await findDuplicateLinkedInUrl(user.id, data.linkedInUrl);
    if (dupName) return { duplicate: true as const, reason: "name" as const, existingId: dupName.id };
    if (dupLinkedIn) return { duplicate: true as const, reason: "linkedin" as const, existingId: dupLinkedIn.id };
  }

  const contact = await prisma.referralContact.create({
    data: {
      userId: user.id,
      fullName: data.fullName,
      company: data.company,
      linkedInUrl: data.linkedInUrl,
      jobTitle: data.jobTitle || null,
      notes: data.notes || null,
      statusId: data.statusId,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      jobApplicationId: data.jobApplicationId || null,
      rank: await nextRank(user.id),
      isIncomplete: false,
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

  const owned = await prisma.referralContact.findFirst({ where: { id, userId: user.id } });
  if (!owned) throw new Error("NOT_FOUND");

  const contact = await prisma.referralContact.update({
    where: { id },
    data: {
      fullName: data.fullName,
      company: data.company,
      linkedInUrl: data.linkedInUrl,
      jobTitle: data.jobTitle || null,
      notes: data.notes || null,
      statusId: data.statusId,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      jobApplicationId: data.jobApplicationId || null,
      isIncomplete: false,
    },
  });

  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return contact;
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

  if (links.length === 0) return { added: 0 };

  const trimmedCompany = company.trim();
  let rank = await nextRank(user.id);
  const rows = links.map((linkedInUrl) => ({
    userId: user.id,
    fullName: "Unnamed Contact",
    company: trimmedCompany,
    linkedInUrl,
    statusId: defaultStatus.id,
    isIncomplete: true,
    rank: rank++,
  }));

  await prisma.referralContact.createMany({ data: rows });
  revalidatePath(PATH);
  revalidateTag(`referral-contacts-${user.id}`, "max");
  return { added: rows.length };
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
