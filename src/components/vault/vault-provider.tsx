"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  buildFolderTree,
  wouldCreateCycle,
  folderPathString,
  parseFolderPath,
  type VaultFolderRow,
  type VaultFolderNode,
} from "@/lib/vault-tree";
import {
  quickAddVaultLink,
  createFolder as createFolderAction,
  renameFolder as renameFolderAction,
  moveFolder as moveFolderAction,
  deleteFolder as deleteFolderAction,
  updateLink as updateLinkAction,
  deleteLink as deleteLinkAction,
  attachLinkToFolder as attachLinkAction,
  detachLinkFromFolder as detachLinkAction,
} from "@/actions/vault.actions";

export interface VaultLinkRow {
  id: string;
  url: string;
  title: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface VaultMembershipRow {
  id: string;
  linkId: string;
  folderId: string;
}

interface VaultData {
  folders: VaultFolderRow[];
  links: VaultLinkRow[];
  memberships: VaultMembershipRow[];
}

interface VaultContextValue extends VaultData {
  tree: VaultFolderNode[];
  linksByFolder: Map<string, VaultLinkRow[]>;
  foldersByLink: Map<string, string[]>;
  folderPaths: { id: string; path: string }[];
  addLinkWithPath: (input: { url: string; title?: string; notes?: string; folderPath?: string }) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveFolder: (id: string, newParentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  updateLink: (id: string, patch: { url?: string; title?: string; notes?: string }) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  attachLinkToFolder: (linkId: string, folderId: string) => Promise<void>;
  detachLinkFromFolder: (linkId: string, folderId: string) => Promise<void>;
}

const VaultContext = React.createContext<VaultContextValue | null>(null);

const tempId = () => `temp-${crypto.randomUUID()}`;

export function VaultProvider({ initial, children }: { initial: VaultData; children: React.ReactNode }) {
  const [data, setData] = React.useState<VaultData>(initial);
  const snapshotRef = React.useRef<VaultData>(initial);

  function snapshot() {
    snapshotRef.current = data;
  }
  function revert(message: string) {
    setData(snapshotRef.current);
    toast.error(message);
  }

  const tree = React.useMemo(() => buildFolderTree(data.folders), [data.folders]);
  const linksByFolder = React.useMemo(() => {
    const linkById = new Map(data.links.map((l) => [l.id, l]));
    const map = new Map<string, VaultLinkRow[]>();
    for (const m of data.memberships) {
      const link = linkById.get(m.linkId);
      if (!link) continue;
      if (!map.has(m.folderId)) map.set(m.folderId, []);
      map.get(m.folderId)!.push(link);
    }
    return map;
  }, [data.links, data.memberships]);
  const foldersByLink = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of data.memberships) {
      if (!map.has(m.linkId)) map.set(m.linkId, []);
      map.get(m.linkId)!.push(m.folderId);
    }
    return map;
  }, [data.memberships]);
  const folderPaths = React.useMemo(
    () => data.folders.map((f) => ({ id: f.id, path: folderPathString(f.id, data.folders) })),
    [data.folders]
  );

  async function addLinkWithPath(input: { url: string; title?: string; notes?: string; folderPath?: string }) {
    snapshot();
    const segments = input.folderPath ? parseFolderPath(input.folderPath) : [];
    const optimisticLinkId = tempId();
    const now = new Date();

    // Optimistically create any missing path segments + the link + membership.
    setData((prev) => {
      let folders = prev.folders;
      let parentId: string | null = null;
      const newFolders: VaultFolderRow[] = [];
      for (const name of segments) {
        const existing = folders.find((f) => f.parentId === parentId && f.name === name);
        if (existing) {
          parentId = existing.id;
        } else {
          const nf: VaultFolderRow = { id: tempId(), name, parentId };
          newFolders.push(nf);
          folders = [...folders, nf];
          parentId = nf.id;
        }
      }
      const link: VaultLinkRow = {
        id: optimisticLinkId,
        url: input.url,
        title: input.title ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      const memberships = parentId
        ? [...prev.memberships, { id: tempId(), linkId: optimisticLinkId, folderId: parentId }]
        : prev.memberships;
      return { folders, links: [link, ...prev.links], memberships };
    });

    try {
      const { link, folderId } = await quickAddVaultLink(input);
      // Patch from the server's real ids/rows rather than trusting the optimistic guess.
      setData((prev) => ({
        ...prev,
        links: prev.links.map((l) => (l.id === optimisticLinkId ? link : l)),
        memberships: prev.memberships.map((m) =>
          m.linkId === optimisticLinkId && folderId ? { ...m, linkId: link.id } : m
        ),
      }));
    } catch {
      revert("Couldn't save that link. Please try again.");
    }
  }

  async function createFolder(name: string, parentId: string | null) {
    snapshot();
    const optimisticId = tempId();
    setData((prev) => ({ ...prev, folders: [...prev.folders, { id: optimisticId, name, parentId }] }));
    try {
      const folder = await createFolderAction(name, parentId);
      setData((prev) => ({ ...prev, folders: prev.folders.map((f) => (f.id === optimisticId ? folder : f)) }));
    } catch {
      revert("Couldn't create that folder.");
    }
  }

  async function renameFolder(id: string, name: string) {
    snapshot();
    setData((prev) => ({ ...prev, folders: prev.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    try {
      await renameFolderAction(id, name);
    } catch {
      revert("Couldn't rename that folder.");
    }
  }

  async function moveFolder(id: string, newParentId: string | null) {
    // Instant client-side rejection against the cached tree — no round trip for the common case.
    if (wouldCreateCycle(id, newParentId, data.folders)) {
      toast.error("Can't move a folder into its own subfolder.");
      return;
    }
    snapshot();
    setData((prev) => ({ ...prev, folders: prev.folders.map((f) => (f.id === id ? { ...f, parentId: newParentId } : f)) }));
    try {
      await moveFolderAction(id, newParentId);
    } catch {
      revert("Couldn't move that folder.");
    }
  }

  async function deleteFolder(id: string) {
    snapshot();
    // Client-side cascade so the UI reflects subfolder removal immediately too.
    const toRemove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of data.folders) {
        if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) {
          toRemove.add(f.id);
          grew = true;
        }
      }
    }
    setData((prev) => ({
      folders: prev.folders.filter((f) => !toRemove.has(f.id)),
      links: prev.links,
      memberships: prev.memberships.filter((m) => !toRemove.has(m.folderId)),
    }));
    try {
      await deleteFolderAction(id);
    } catch {
      revert("Couldn't delete that folder.");
    }
  }

  async function updateLink(id: string, patch: { url?: string; title?: string; notes?: string }) {
    snapshot();
    setData((prev) => ({ ...prev, links: prev.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    try {
      const link = await updateLinkAction(id, patch);
      setData((prev) => ({ ...prev, links: prev.links.map((l) => (l.id === id ? link : l)) }));
    } catch {
      revert("Couldn't save changes.");
    }
  }

  async function deleteLink(id: string) {
    snapshot();
    setData((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== id),
      memberships: prev.memberships.filter((m) => m.linkId !== id),
    }));
    try {
      await deleteLinkAction(id);
    } catch {
      revert("Couldn't delete that link.");
    }
  }

  async function attachLinkToFolder(linkId: string, folderId: string) {
    if (data.memberships.some((m) => m.linkId === linkId && m.folderId === folderId)) return;
    snapshot();
    const optimisticId = tempId();
    setData((prev) => ({ ...prev, memberships: [...prev.memberships, { id: optimisticId, linkId, folderId }] }));
    try {
      await attachLinkAction(linkId, folderId);
    } catch {
      revert("Couldn't add to that folder.");
    }
  }

  async function detachLinkFromFolder(linkId: string, folderId: string) {
    snapshot();
    setData((prev) => ({
      ...prev,
      memberships: prev.memberships.filter((m) => !(m.linkId === linkId && m.folderId === folderId)),
    }));
    try {
      await detachLinkAction(linkId, folderId);
    } catch {
      revert("Couldn't remove from that folder.");
    }
  }

  const value: VaultContextValue = {
    ...data,
    tree,
    linksByFolder,
    foldersByLink,
    folderPaths,
    addLinkWithPath,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    updateLink,
    deleteLink,
    attachLinkToFolder,
    detachLinkFromFolder,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = React.useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within a VaultProvider");
  return ctx;
}
