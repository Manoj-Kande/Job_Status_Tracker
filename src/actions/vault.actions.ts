"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseFolderPath, wouldCreateCycle, type VaultFolderRow } from "@/lib/vault-tree";
import { searchVaultLinks } from "@/lib/vault-queries";

export async function searchVaultLinksAction(query: string) {
  return searchVaultLinks(query);
}

function bump() {
  revalidatePath("/vault");
}

async function assertOwnsFolder(userId: string, folderId: string) {
  const folder = await prisma.vaultFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) throw new Error("NOT_FOUND");
  return folder;
}

/**
 * Resolves (creating as needed) every folder in a "a/b/c" path and attaches
 * a link to the final segment — all in one transaction, so a path that's
 * half-new never leaves the folder tree half-created if something fails
 * partway through.
 */
async function resolveOrCreatePathInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  segments: string[]
): Promise<string | null> {
  let parentId: string | null = null;
  for (const name of segments) {
    const existing: { id: string } | null = await tx.vaultFolder.findFirst({
      where: { userId, parentId, name },
      select: { id: true },
    });
    if (existing) {
      parentId = existing.id;
    } else {
      const created: { id: string } = await tx.vaultFolder.create({
        data: { userId, parentId, name },
        select: { id: true },
      });
      parentId = created.id;
    }
  }
  return parentId;
}

const quickAddSchema = z.object({
  url: z.string().trim().url("Enter a valid URL"),
  title: z.string().trim().max(300).optional(),
  notes: z.string().max(2000).optional(),
  folderPath: z.string().max(500).optional(), // e.g. "linkedin/java/threading"
});
export type VaultQuickAddInput = z.input<typeof quickAddSchema>;

/** Nothing but the URL is required. Missing folders in the path are created atomically. */
export async function quickAddVaultLink(input: VaultQuickAddInput) {
  const user = await requireUser();
  const data = quickAddSchema.parse(input);
  const segments = data.folderPath ? parseFolderPath(data.folderPath) : [];

  const { link, folderId } = await prisma.$transaction(async (tx) => {
    const folderId = segments.length ? await resolveOrCreatePathInTx(tx, user.id, segments) : null;
    const link = await tx.vaultLink.create({
      data: { userId: user.id, url: data.url, title: data.title, notes: data.notes },
    });
    if (folderId) {
      await tx.vaultLinkFolder.create({ data: { userId: user.id, linkId: link.id, folderId } });
    }
    return { link, folderId };
  });

  bump();
  return { link, folderId };
}

export async function createFolder(name: string, parentId?: string | null) {
  const user = await requireUser();
  if (parentId) await assertOwnsFolder(user.id, parentId);

  const folder = await prisma.vaultFolder.create({
    data: { userId: user.id, name: name.trim() || "Untitled folder", parentId: parentId ?? null },
  });
  bump();
  return folder;
}

export async function renameFolder(id: string, name: string) {
  const user = await requireUser();
  await assertOwnsFolder(user.id, id);
  const folder = await prisma.vaultFolder.update({ where: { id }, data: { name: name.trim() || "Untitled folder" } });
  bump();
  return folder;
}

/** Moves a folder under a new parent (or to root if null). Re-validated server-side even though the client pre-checks against its cached tree. */
export async function moveFolder(id: string, newParentId: string | null) {
  const user = await requireUser();
  await assertOwnsFolder(user.id, id);
  if (newParentId) await assertOwnsFolder(user.id, newParentId);

  const folder = await prisma.$transaction(async (tx) => {
    // Re-fetch fresh inside the transaction — never trust a client-supplied
    // "it's not a cycle" claim, and never trust a snapshot read before the tx.
    const allFolders: VaultFolderRow[] = await tx.vaultFolder.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, parentId: true },
    });
    if (wouldCreateCycle(id, newParentId, allFolders)) {
      throw new Error("CYCLE_DETECTED");
    }
    return tx.vaultFolder.update({ where: { id }, data: { parentId: newParentId } });
  });

  bump();
  return folder;
}

/** DB-level cascade (onDelete: Cascade on parentId) takes care of subfolders. */
export async function deleteFolder(id: string) {
  const user = await requireUser();
  await assertOwnsFolder(user.id, id);
  await prisma.vaultFolder.delete({ where: { id } });
  bump();
  return { success: true };
}

const linkSchema = z.object({
  url: z.string().trim().url("Enter a valid URL"),
  title: z.string().trim().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export async function updateLink(id: string, input: Partial<z.input<typeof linkSchema>>) {
  const user = await requireUser();
  const existing = await prisma.vaultLink.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  const data = linkSchema.partial().parse(input);
  const link = await prisma.vaultLink.update({ where: { id }, data });
  bump();
  return link;
}

export async function deleteLink(id: string) {
  const user = await requireUser();
  const existing = await prisma.vaultLink.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("NOT_FOUND");
  await prisma.vaultLink.delete({ where: { id } });
  bump();
  return { success: true };
}

export async function attachLinkToFolder(linkId: string, folderId: string) {
  const user = await requireUser();
  const [link, folder] = await Promise.all([
    prisma.vaultLink.findFirst({ where: { id: linkId, userId: user.id } }),
    prisma.vaultFolder.findFirst({ where: { id: folderId, userId: user.id } }),
  ]);
  if (!link || !folder) throw new Error("NOT_FOUND");

  const membership = await prisma.vaultLinkFolder.upsert({
    where: { linkId_folderId: { linkId, folderId } },
    update: {},
    create: { userId: user.id, linkId, folderId },
  });
  bump();
  return membership;
}

export async function detachLinkFromFolder(linkId: string, folderId: string) {
  const user = await requireUser();
  await prisma.vaultLinkFolder.deleteMany({ where: { userId: user.id, linkId, folderId } });
  bump();
  return { success: true };
}