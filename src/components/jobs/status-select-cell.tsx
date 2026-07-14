"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ApplicationStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";
import { updateJobStatus } from "@/actions/job.actions";

/**
 * Inline status changer used in list/table views (desktop table + mobile
 * card list), mirroring the one already on the kanban board so status can
 * be updated without opening the job detail page.
 */
export function StatusSelectCell({
  jobId,
  status,
  className,
}: {
  jobId: string;
  status: ApplicationStatus;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  function handleChange(next: ApplicationStatus) {
    if (next === status) return;
    setPending(true);
    updateJobStatus(jobId, next)
      .then(() => {
        toast.success("Status updated");
        router.refresh();
      })
      .catch(() => toast.error("Couldn't update status"))
      .finally(() => setPending(false));
  }

  return (
    <Select value={status} onValueChange={(v) => handleChange(v as ApplicationStatus)} disabled={pending}>
      <SelectTrigger className={className ?? "h-7 w-[180px] text-xs"} onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
