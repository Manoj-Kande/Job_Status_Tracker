"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bulkAddReferralLinks } from "@/actions/referral-contact.actions";

export function BulkAddDialog({
  open,
  onOpenChange,
  companies,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Existing company names — checked against as the user types below. */
  companies: string[];
}) {
  const router = useRouter();
  const [links, setLinks] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const exactMatch = companies.find((c) => c.toLowerCase() === company.trim().toLowerCase());
  const suggestions = React.useMemo(() => {
    const q = company.trim().toLowerCase();
    if (!q) return companies.slice(0, 8);
    return companies.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [company, companies]);

  async function handleSubmit() {
    if (!links.trim()) {
      toast.error("Paste at least one LinkedIn link");
      return;
    }
    setSubmitting(true);
    try {
      const { added } = await bulkAddReferralLinks(links, company);
      toast.success(`${added} stub contact${added === 1 ? "" : "s"} added`, {
        description:
          added > 0
            ? `Marked Incomplete${company.trim() ? ` under "${company.trim()}"` : ""} — fill in the rest later.`
            : "No valid LinkedIn links found.",
      });
      setLinks("");
      setCompany("");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk Add via LinkedIn Links</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-company">
              Company <span className="text-muted-foreground font-normal">(optional, applies to all)</span>
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bulk-company"
                  className="pl-8"
                  placeholder="Search an existing company or type a new one"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                  autoComplete="off"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md">
                  {suggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setCompany(c); setShowSuggestions(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <Check className={`size-3.5 shrink-0 ${c.toLowerCase() === company.trim().toLowerCase() ? "opacity-100" : "opacity-0"}`} />
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {company.trim() === "" ? (
                "Start typing to search your existing companies — pick one, or keep typing to tag these contacts under a new company."
              ) : exactMatch ? (
                <span className="text-foreground">✓ Existing company — these contacts will be added under it.</span>
              ) : (
                `No match — "${company.trim()}" will be added as a new company.`
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-links">Paste LinkedIn URLs, separated by commas</Label>
            <Textarea
              id="bulk-links"
              rows={5}
              placeholder="https://linkedin.com/in/person1, https://linkedin.com/in/person2"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Each link becomes a contact marked <span className="font-medium text-foreground">Incomplete</span> with
              default status &quot;Can Ask Referral&quot; — fill in the name (and company, if left blank) later.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Adding..." : "Add Stub Contacts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
