"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const PATH = "/referral-contacts";

function tag(userId: string) {
  return `referral-stat-cards-${userId}`;
}

export async function createStatCard(label: string, statusIds: string[]) {
  const user = await requireUser();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("EMPTY_LABEL");

  const last = await prisma.referralStatCard.findFirst({ where: { userId: user.id }, orderBy: { sortOrder: "desc" } });
  const card = await prisma.referralStatCard.create({
    data: { userId: user.id, label: trimmed, statusIds, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  revalidateTag(tag(user.id), "max");
  revalidatePath(PATH);
  return card;
}

export async function updateStatCard(id: string, input: { label?: string; statusIds?: string[] }) {
  const user = await requireUser();
  const card = await prisma.referralStatCard.findFirst({ where: { id, userId: user.id } });
  if (!card) throw new Error("NOT_FOUND");

  const label = input.label?.trim();
  if (input.label !== undefined && !label) throw new Error("EMPTY_LABEL");

  const updated = await prisma.referralStatCard.update({
    where: { id },
    data: {
      ...(label ? { label } : {}),
      ...(input.statusIds ? { statusIds: input.statusIds } : {}),
    },
  });

  revalidateTag(tag(user.id), "max");
  revalidatePath(PATH);
  return updated;
}

export async function deleteStatCard(id: string) {
  const user = await requireUser();
  const card = await prisma.referralStatCard.findFirst({ where: { id, userId: user.id } });
  if (!card) throw new Error("NOT_FOUND");

  await prisma.referralStatCard.delete({ where: { id } });
  revalidateTag(tag(user.id), "max");
  revalidatePath(PATH);
  return { success: true };
}

/** Persists a full front-to-back reorder — the caller sends the complete new id order. */
export async function reorderStatCards(orderedIds: string[]) {
  const user = await requireUser();
  const owned = await prisma.referralStatCard.findMany({ where: { userId: user.id }, select: { id: true } });
  const ownedIds = new Set(owned.map((c) => c.id));
  if (!orderedIds.every((id) => ownedIds.has(id))) throw new Error("NOT_FOUND");

  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.referralStatCard.update({ where: { id }, data: { sortOrder: i } }))
  );

  revalidateTag(tag(user.id), "max");
  revalidatePath(PATH);
  return { success: true };
}
