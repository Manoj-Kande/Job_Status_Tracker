import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** One batched load: all folders + all links + all memberships, 3 parallel indexed queries. */
export async function getVaultData() {
  const user = await getCurrentUser();
  if (!user) return { folders: [], links: [], memberships: [] };

  const [folders, links, memberships] = await Promise.all([
    prisma.vaultFolder.findMany({ where: { userId: user.id } }),
    prisma.vaultLink.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.vaultLinkFolder.findMany({ where: { userId: user.id } }),
  ]);

  return { folders, links, memberships };
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
