"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/components/vault/vault-provider";
import { parseFolderPath } from "@/lib/vault-tree";

export function VaultQuickAdd() {
  const { addLinkWithPath, folderPaths } = useVault();
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [path, setPath] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const suggestions = React.useMemo(() => {
    if (!path.trim()) return [];
    return folderPaths.filter((f) => f.path.toLowerCase().startsWith(path.toLowerCase())).slice(0, 6);
  }, [path, folderPaths]);

  const existingPaths = new Set(folderPaths.map((f) => f.path.toLowerCase()));
  const segments = parseFolderPath(path);
  // Which prefix of the typed path doesn't exist yet -> those segments will be created.
  let newFromIndex = segments.length;
  for (let i = 0; i < segments.length; i++) {
    const prefix = segments.slice(0, i + 1).join("/").toLowerCase();
    if (!existingPaths.has(prefix)) {
      newFromIndex = i;
      break;
    }
  }
  const willCreate = segments.slice(newFromIndex);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Paste a URL first");
      return;
    }
    setSubmitting(true);
    try {
      await addLinkWithPath({ url: url.trim(), title: title.trim() || undefined, folderPath: path.trim() || undefined });
      setUrl("");
      setTitle("");
      setPath("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex gap-2">
        <Input placeholder="Paste a URL..." value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={submitting} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[160px] flex-1"
        />
        <div className="relative min-w-[200px] flex-1">
          <Input
            placeholder="Folder path e.g. linkedin/java (optional)"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={() => setPath(s.path)}
                >
                  {s.path}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {willCreate.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Will create: <span className="font-medium text-foreground">{willCreate.join(" / ")}</span>
        </p>
      )}
    </form>
  );
}
