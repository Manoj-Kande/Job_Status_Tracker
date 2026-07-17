import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** One batched load: all folders + all links + all memberships, 3 parallel indexed queries.
 *  Cached per-user, invalidated via revalidateTag(`vault-data-${userId}`) from vault.actions.ts. */
export async function getVaultData() {
  const user = await getCurrentUser();
  if (!user) return { folders: [], links: [], memberships: [] };

  return unstable_cache(
    async () => {
      const [folders, links, memberships] = await Promise.all([
        prisma.vaultFolder.findMany({ where: { userId: user.id } }),
        prisma.vaultLink.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
        prisma.vaultLinkFolder.findMany({ where: { userId: user.id } }),
      ]);
      return { folders, links, memberships };
    },
    ["vault-data", user.id],
    { tags: [`vault-data-${user.id}`], revalidate: 300 }
  )();
}

/** Flat, indexed text search — never a tree walk. Caller resolves breadcrumbs from the cached tree. */
export async function searchVaultLinks(query: string) {
  const user = await getCurrentUser();
  if (!user || !query.trim()) return [];

  return prisma.vaultLink.findMany({
    where: {
      userId: user.id,
      OR: [
        { url: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { folders: { select: { folderId: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}
