"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { ReferralContact, ReferralContactStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ReferralStatusBadge } from "@/components/referral-contacts/status-badge";
import { deleteReferralContact } from "@/actions/referral-contact.actions";
import { cn, linkedInHandle } from "@/lib/utils";

type ContactWithStatus = ReferralContact & {
  status: ReferralContactStatus;
  jobApplication?: { id: string; companyName: string; jobTitle: string } | null;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function ContactCompanyView({
  contacts,
  onEdit,
}: {
  contacts: ContactWithStatus[];
  onEdit: (contact: ReferralContact) => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const groups = React.useMemo(() => {
    const map = new Map<string, ContactWithStatus[]>();
    for (const c of contacts) {
      const key = c.company.trim() || "No Company Set";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [contacts]);

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

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center">
        <h3 className="text-sm font-semibold">No contacts found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Try a different search term or filter.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map(([company, members]) => {
        const isCollapsed = collapsed[company];
        return (
          <div key={company} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [company]: !prev[company] }))}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
            >
              <div className="flex items-center gap-2.5">
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                <span className="font-semibold">{company}</span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                  {members.length} contact{members.length > 1 ? "s" : ""}
                </span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-border">
                {members.map((c) => (
                  <div key={c.id} className="group flex items-center justify-between gap-3 border-b border-border px-4 py-3 pl-9 last:border-b-0 hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                        {initials(c.fullName)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {c.fullName}
                          {c.isIncomplete && (
                            <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                              Incomplete
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.jobTitle || "No title set"} ·{" "}
                          <a
                            href={c.linkedInUrl.startsWith("http") ? c.linkedInUrl : `https://${c.linkedInUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            {linkedInHandle(c.linkedInUrl)}
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReferralStatusBadge label={c.status.label} />
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
