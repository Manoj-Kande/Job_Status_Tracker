import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function WidgetCard({
  title,
  icon: Icon,
  emphasis,
  items,
  emptyLabel,
}: {
  title: string;
  icon: LucideIcon;
  emphasis?: boolean;
  emptyLabel: string;
  items: { id: string; primary: string; secondary: string; href: string }[];
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", emphasis && items.length > 0 ? "border-destructive/40" : "border-border")}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("size-4", emphasis && items.length > 0 ? "text-destructive" : "text-muted-foreground")} />
        <h3 className="text-sm font-semibold">{title}</h3>
        {items.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-md px-1 py-0.5 hover:bg-accent/50">
              <p className="truncate text-sm font-medium">{item.primary}</p>
              <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
