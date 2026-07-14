// Pure, framework-agnostic helpers over flat Vault rows. No I/O here so the
// exact same logic runs server-side (cycle checks in actions) and
// client-side (building the tree once per load, instant client-side cycle
// pre-check before ever hitting the server).

export interface VaultFolderRow {
  id: string;
  name: string;
  parentId: string | null;
}

export interface VaultFolderNode extends VaultFolderRow {
  children: VaultFolderNode[];
}

/** O(n) flat rows -> nested tree. Call once per load, not per render. */
export function buildFolderTree(folders: VaultFolderRow[]): VaultFolderNode[] {
  const byId = new Map<string, VaultFolderNode>();
  for (const f of folders) byId.set(f.id, { ...f, children: [] });

  const roots: VaultFolderNode[] = [];
  for (const f of folders) {
    const node = byId.get(f.id)!;
    if (f.parentId && byId.has(f.parentId)) {
      byId.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: VaultFolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** All descendant folder ids of `folderId` (not including itself). */
export function getDescendantIds(folderId: string, folders: VaultFolderRow[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parentId) continue;
    if (!childrenOf.has(f.parentId)) childrenOf.set(f.parentId, []);
    childrenOf.get(f.parentId)!.push(f.id);
  }
  const result = new Set<string>();
  const stack = [...(childrenOf.get(folderId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return result;
}

/** True if moving `folderId` to become a child of `newParentId` would create a cycle. */
export function wouldCreateCycle(folderId: string, newParentId: string | null, folders: VaultFolderRow[]): boolean {
  if (!newParentId) return false;
  if (newParentId === folderId) return true;
  return getDescendantIds(folderId, folders).has(newParentId);
}

/** Breadcrumb path segments (root -> ... -> folder) for a given folder id. */
export function getFolderPath(folderId: string | null, folders: VaultFolderRow[]): VaultFolderRow[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: VaultFolderRow[] = [];
  let cur = folderId ? byId.get(folderId) : undefined;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** "linkedin/java/threading" -> ["linkedin", "java", "threading"], trimmed, empty segments dropped. */
export function parseFolderPath(path: string): string[] {
  return path
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Full "a/b/c" path string for a folder, for autocomplete + breadcrumb display. */
export function folderPathString(folderId: string, folders: VaultFolderRow[]): string {
  return getFolderPath(folderId, folders)
    .map((f) => f.name)
    .join("/");
}
