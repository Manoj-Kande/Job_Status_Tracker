"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updatedAt", label: "Last updated" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
  { value: "dateDiscovered", label: "Date discovered" },
  { value: "nextFollowUpDate", label: "Next follow-up" },
  { value: "dateApplied", label: "Date applied" },
];

const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];
const WORK_MODE_OPTIONS = ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"];

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => setParam("search", search || null), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const view = searchParams.get("view") ?? "list";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search company or title..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select defaultValue={searchParams.get("priority") ?? "all"} onValueChange={(v) => setParam("priority", v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("workMode") ?? "all"} onValueChange={(v) => setParam("workMode", v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Work mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {WORK_MODE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("sort") ?? "updatedAt"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5 self-start">
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2", view === "list" && "bg-accent")}
          onClick={() => setParam("view", "list")}
        >
          <ListIcon className="size-3.5" /> List
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2", view === "kanban" && "bg-accent")}
          onClick={() => setParam("view", "kanban")}
        >
          <LayoutGrid className="size-3.5" /> Kanban
        </Button>
      </div>
    </div>
  );
}
