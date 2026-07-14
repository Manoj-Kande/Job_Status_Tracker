import { format } from "date-fns";
import { STATUS_META } from "@/lib/status";
import type { ApplicationStatus } from "@prisma/client";

type Event = {
  id: string;
  eventType: string;
  newStatus: ApplicationStatus;
  createdAt: Date;
  jobApplication: { companyName: string; jobTitle: string };
};

export function ActivityTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet — add your first job to get started.</p>;
  }
  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-border" />}
          <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm">
              <span className="font-medium">{event.jobApplication.companyName}</span>{" "}
              <span className="text-muted-foreground">
                {event.eventType === "STATUS_CHANGE" ? `→ ${STATUS_META[event.newStatus].label}` : event.eventType.replaceAll("_", " ")}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{format(event.createdAt, "MMM d, h:mm a")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
