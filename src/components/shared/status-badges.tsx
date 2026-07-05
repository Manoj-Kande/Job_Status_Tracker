import type { ApplicationStatus, Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { STATUS_META, PRIORITY_META } from "@/lib/status";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
