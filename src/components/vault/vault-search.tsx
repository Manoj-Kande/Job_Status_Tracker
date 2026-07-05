"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useVault } from "@/components/vault/vault-provider";
import { searchVaultLinksAction } from "@/actions/vault.actions";
import { folderPathString } from "@/lib/vault-tree";

export function VaultSearch() {
  const { folders } = useVault();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Awaited<ReturnType<typeof searchVaultLinksAction>>>([]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchVaultLinksAction(query).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search links..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
      </div>
      {query.trim() && (
        <div className="mt-2 space-y-1 rounded-lg border border-border bg-card p-2">
          {results.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No matches</p>
          ) : (
            results.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded px-2 py-1.5 hover:bg-muted"
              >
                <p className="truncate text-sm">{r.title || r.url}</p>
                {/* Breadcrumb resolved from the already-cached tree, not a DB join */}
                <p className="truncate text-xs text-muted-foreground">
                  {r.folders.length > 0
                    ? r.folders.map((f) => folderPathString(f.folderId, folders)).join(", ")
                    : "Not in a folder"}
                </p>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
