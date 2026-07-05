"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Referral } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { createReferral } from "@/actions/referral.actions";

export function ReferralTab({ jobId, referrals }: { jobId: string; referrals: Referral[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createReferral(jobId, { contactName: name.trim(), contactEmail: email.trim() || undefined });
      toast.success("Referral contact added");
      setName("");
      setEmail("");
      router.refresh();
    } catch {
      toast.error("Couldn't add referral");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {referrals.length === 0 ? (
        <EmptyState icon={Users} title="No referral contacts yet" description="Add a contact who's referring you for this role." />
      ) : (
        <div className="space-y-2">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">{r.contactName}</p>
                {r.contactEmail && <p className="text-xs text-muted-foreground">{r.contactEmail}</p>}
              </div>
              <Badge variant="outline">{r.referralStatus.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <Label className="text-xs text-muted-foreground">Add a referral contact</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Contact name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()}>
          {saving ? "Adding..." : "Add contact"}
        </Button>
      </div>
    </div>
  );
}
