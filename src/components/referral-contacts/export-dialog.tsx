"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportReferralContacts, exportReferralContactsCsv } from "@/actions/referral-contact.actions";

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [json, setJson] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    exportReferralContacts().then((data) => {
      if (!cancelled) setJson(JSON.stringify(data, null, 2));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loading = open && !json;

  function handleCopy() {
    navigator.clipboard.writeText(json).then(() => toast.success("Copied to clipboard"));
  }

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    download(json, "referral-contacts-export.json", "application/json");
    toast.success("Export downloaded");
  }

  async function handleDownloadCsv() {
    const csv = await exportReferralContactsCsv();
    download(csv, "referral-contacts-export.csv", "text/csv");
    toast.success("CSV downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Export Referral Contacts</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          This is your data as a portable JSON file. Another user can import this file to load a copy of these
          contacts into their own account.
        </p>
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] whitespace-pre-wrap break-all">
          {loading ? "Preparing export..." : json}
        </pre>
        <p className="text-xs text-muted-foreground">
          JSON round-trips cleanly through Import (including custom statuses). CSV is for opening in Excel/Sheets.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleCopy} disabled={loading}>Copy JSON</Button>
          <Button variant="outline" onClick={handleDownloadCsv} disabled={loading}>Download .csv</Button>
          <Button onClick={handleDownload} disabled={loading}>Download .json</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
