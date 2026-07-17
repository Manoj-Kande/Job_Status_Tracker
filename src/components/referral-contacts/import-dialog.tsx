"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { importReferralContacts } from "@/actions/referral-contact.actions";

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleImport() {
    if (!text.trim()) {
      toast.error("Paste JSON to import");
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      toast.error("Invalid JSON", { description: "Check the pasted content and try again." });
      return;
    }
    if (!payload?.contacts || !Array.isArray(payload.contacts)) {
      toast.error("This file has no contacts to import");
      return;
    }

    setSubmitting(true);
    try {
      const { added, flagged } = await importReferralContacts(payload);
      toast.success(`${added} contact${added === 1 ? "" : "s"} imported`, {
        description: flagged > 0 ? `${flagged} possible duplicate${flagged === 1 ? "" : "s"} flagged — review them in the list.` : undefined,
      });
      setText("");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Import failed", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import Referral Contacts</DialogTitle></DialogHeader>
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="import-json">Paste exported JSON</Label>
          <Textarea
            id="import-json"
            rows={7}
            placeholder="Paste the JSON exported from another user's account here"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Contacts are copied into <span className="font-medium text-foreground">your</span> account — the other
            user&apos;s data is never modified. Possible duplicates are flagged, not blocked.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={submitting}>{submitting ? "Importing..." : "Import Contacts"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
