import type { StatusHistory } from "@prisma/client";
import { format } from "date-fns";
import { STATUS_META } from "@/lib/status";
import { EmptyState } from "@/components/shared/empty-state";
import { History } from "lucide-react";

export function TimelineTab({ events }: { events: StatusHistory[] }) {
  if (events.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Status changes and events will appear here." />;
  }

  return (
    <div className="max-w-xl space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i < events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-border" />}
          <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm font-medium">
              {event.eventType === "STATUS_CHANGE"
                ? `Moved to ${STATUS_META[event.newStatus].label}`
                : event.eventType.replaceAll("_", " ")}
            </p>
            {event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}
            <p className="text-xs text-muted-foreground">{format(event.createdAt, "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
