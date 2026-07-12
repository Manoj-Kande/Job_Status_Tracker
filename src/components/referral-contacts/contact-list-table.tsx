"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Pencil, Trash2, ExternalLink, Link2, CalendarClock } from "lucide-react";
import type { ReferralContact, ReferralContactStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ReferralStatusBadge } from "@/components/referral-contacts/status-badge";
import { deleteReferralContact, reorderReferralContacts } from "@/actions/referral-contact.actions";
import { cn, linkedInHandle } from "@/lib/utils";

type ContactWithStatus = ReferralContact & {
  status: ReferralContactStatus;
  jobApplication?: { id: string; companyName: string; jobTitle: string } | null;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ContactListTable({
  contacts,
  rankMode,
  onEdit,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  contacts: ContactWithStatus[];
  rankMode: boolean;
  onEdit: (contact: ReferralContact) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [localOrder, setLocalOrder] = React.useState(contacts);
  const [prevContacts, setPrevContacts] = React.useState(contacts);
  const dragId = React.useRef<string | null>(null);

  // Resync local (draggable) order when the server-provided list changes
  // (new page, new filter, etc.) — done as a render-time adjustment rather
  // than an effect, so there's no extra render pass after the props update.
  if (contacts !== prevContacts) {
    setPrevContacts(contacts);
    setLocalOrder(contacts);
  }

  async function handleDelete(contact: ReferralContact) {
    if (!confirm(`Delete ${contact.fullName}? This can't be undone.`)) return;
    try {
      await deleteReferralContact(contact.id);
      toast.success("Contact deleted");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that contact");
    }
  }

  function handleDrop(targetId: string) {
    const fromIdx = localOrder.findIndex((c) => c.id === dragId.current);
    const toIdx = localOrder.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const next = [...localOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLocalOrder(next);

    reorderReferralContacts(next.map((c) => c.id))
      .then(() => {
        toast.success("Ranking updated");
        router.refresh();
      })
      .catch(() => toast.error("Couldn't save the new order"));
  }

  if (localOrder.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center">
        <h3 className="text-sm font-semibold">No contacts found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Try a different search term or filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            {rankMode && <th className="w-8 px-3 py-2.5"></th>}
            {onToggleSelect && (
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-border accent-primary"
                  checked={localOrder.length > 0 && localOrder.every((c) => selectedIds?.has(c.id))}
                  onChange={() => onToggleSelectAll?.(localOrder.map((c) => c.id))}
                />
              </th>
            )}
            <th className="px-3 py-2.5 font-semibold">Contact</th>
            <th className="px-3 py-2.5 font-semibold">Company</th>
            <th className="px-3 py-2.5 font-semibold">Job Title</th>
            <th className="px-3 py-2.5 font-semibold">LinkedIn</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Last Updated</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {localOrder.map((c, i) => (
            <tr
              key={c.id}
              draggable={rankMode}
              onDragStart={() => (dragId.current = c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(c.id)}
              className="group relative border-b border-border last:border-b-0 hover:bg-muted/30"
            >
              {rankMode && (
                <td className="px-3 py-2.5 text-muted-foreground">
                  <GripVertical className="size-4 cursor-grab" />
                </td>
              )}
              {onToggleSelect && (
                <td className="relative px-3 py-2.5">
                  <span
                    className={cn(
                      "pointer-events-none absolute left-[13px] w-px bg-[#E5E2D9] dark:bg-border",
                      i === 0 && "top-1/2 bottom-0",
                      i === localOrder.length - 1 && "top-0 h-1/2",
                      i !== 0 && i !== localOrder.length - 1 && "top-0 bottom-0"
                    )}
                  />
                  <span className="pointer-events-none absolute left-[10px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#1F6F5C] ring-2 ring-card dark:bg-primary" />
                  <input
                    type="checkbox"
                    className="relative z-10 size-3.5 rounded border-border accent-primary"
                    checked={!!selectedIds?.has(c.id)}
                    onChange={() => onToggleSelect(c.id)}
                  />
                </td>
              )}
              <td className="px-3 py-2.5">
                <div className="font-medium">
                  {c.fullName}
                  {c.isIncomplete && (
                    <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                      Incomplete
                    </span>
                  )}
                </div>
                {c.notes && <div className="max-w-64 truncate text-xs text-muted-foreground">{c.notes}</div>}
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {c.jobApplication && (
                    <span className="inline-flex items-center gap-1"><Link2 className="size-3" />{c.jobApplication.companyName}</span>
                  )}
                  {c.nextFollowUpDate && (
                    <span className={cn("inline-flex items-center gap-1", new Date(c.nextFollowUpDate) <= new Date() && "text-warning")}>
                      <CalendarClock className="size-3" />
                      {formatDate(c.nextFollowUpDate)}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5">{c.company || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2.5">{c.jobTitle || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2.5">
                <a
                  href={c.linkedInUrl.startsWith("http") ? c.linkedInUrl : `https://${c.linkedInUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {linkedInHandle(c.linkedInUrl)}
                </a>
              </td>
              <td className="px-3 py-2.5"><ReferralStatusBadge label={c.status.label} /></td>
              <td className="px-3 py-2.5 text-muted-foreground">{formatDate(c.updatedAt)}</td>
              <td className="px-3 py-2.5">
                <div className={cn("flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100")}>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(c)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
