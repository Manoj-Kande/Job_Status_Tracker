"use client";

import * as React from "react";
import { ChevronRight, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2, FolderInput, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVault, type VaultLinkRow } from "@/components/vault/vault-provider";
import type { VaultFolderNode } from "@/lib/vault-tree";

function MoveDialog({
  open,
  onOpenChange,
  onPick,
  excludeId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (folderId: string | null) => void;
  excludeId?: string;
}) {
  const { folderPaths } = useVault();
  const options = folderPaths.filter((f) => f.id !== excludeId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Move to...</DialogTitle></DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          <button
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => { onPick(null); onOpenChange(false); }}
          >
            (Root)
          </button>
          {options.map((f) => (
            <button
              key={f.id}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => { onPick(f.id); onOpenChange(false); }}
            >
              {f.path}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({ link, folderId }: { link: VaultLinkRow; folderId: string }) {
  const { deleteLink, detachLinkFromFolder, updateLink } = useVault();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(link.title ?? "");

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
      {editing ? (
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { setEditing(false); updateLink(link.id, { title }); }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-6 flex-1 text-xs"
        />
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-xs hover:underline"
          title={link.url}
        >
          {link.title || link.url}
        </a>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-5 shrink-0"><MoreHorizontal className="size-3" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(link.url, "_blank")}><ExternalLink /> Open</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditing(true)}><Pencil /> Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={() => detachLinkFromFolder(link.id, folderId)}>Remove from folder</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { if (confirm("Delete this link entirely (from all folders)?")) deleteLink(link.id); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 /> Delete link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FolderRow({ node, depth }: { node: VaultFolderNode; depth: number }) {
  const { linksByFolder, createFolder, renameFolder, moveFolder, deleteFolder } = useVault();
  const [expanded, setExpanded] = React.useState(depth === 0);
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(node.name);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const links = linksByFolder.get(node.id) ?? [];
  const hasContent = node.children.length > 0 || links.length > 0;

  return (
    <div>
      <div className="group flex items-center gap-1 rounded px-1 py-1 hover:bg-muted/50" style={{ paddingLeft: depth * 16 }}>
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 p-0.5" aria-label="Toggle folder">
          <ChevronRight className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""} ${hasContent ? "" : "opacity-30"}`} />
        </button>
        <Folder className="size-3.5 shrink-0 text-muted-foreground" />
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setRenaming(false); if (name.trim()) renameFolder(node.id, name); }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-6 flex-1 text-sm"
          />
        ) : (
          <span className="flex-1 truncate text-sm" onDoubleClick={() => setRenaming(true)}>{node.name}</span>
        )}
        <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="size-6" onClick={() => createFolder("New folder", node.id)} title="New subfolder">
            <FolderPlus className="size-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6"><MoreHorizontal className="size-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}><Pencil /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMoveOpen(true)}><FolderInput /> Move to...</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { if (confirm(`Delete "${node.name}" and everything inside it?`)) deleteFolder(node.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (
        <div>
          {links.map((l) => (
            <div key={l.id} style={{ paddingLeft: (depth + 1) * 16 }}>
              <LinkRow link={l} folderId={node.id} />
            </div>
          ))}
          {node.children.map((child) => (
            <FolderRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} onPick={(target) => moveFolder(node.id, target)} excludeId={node.id} />
    </div>
  );
}

export function VaultTree() {
  const { tree, createFolder } = useVault();
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="mb-1 flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => createFolder("New folder", null)}>
          <FolderPlus className="size-3.5" /> New folder
        </Button>
      </div>
      {tree.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">No folders yet — add a link with a path, or create one above.</p>
      ) : (
        tree.map((node) => <FolderRow key={node.id} node={node} depth={0} />)
      )}
    </div>
  );
}
