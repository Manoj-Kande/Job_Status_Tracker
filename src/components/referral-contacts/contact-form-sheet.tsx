"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ReferralContact, ReferralContactActivity, ReferralContactStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  referralContactFormSchema,
  type ReferralContactFormInput,
} from "@/lib/validations/referral-contact.schema";
import { addContactActivity, createReferralContact, listContactActivity, updateReferralContact } from "@/actions/referral-contact.actions";
import { toDateInputValue } from "@/lib/utils";

type JobOption = { id: string; companyName: string; jobTitle: string };

function emptyValues(defaultStatusId: string): ReferralContactFormInput {
  return {
    fullName: "", company: "", linkedInUrl: "", jobTitle: "", notes: "",
    statusId: defaultStatusId, nextFollowUpDate: "", jobApplicationId: "",
  };
}

function valuesFromContact(contact: ReferralContact): ReferralContactFormInput {
  return {
    // Bulk Add now guesses a name from the LinkedIn slug when it can (still
    // marked isIncomplete until the person confirms it) — that's worth
    // showing, editable, rather than forcing a retype. Only the old literal
    // placeholder from before that existed gets blanked out.
    fullName: contact.fullName === "Unnamed Contact" ? "" : contact.fullName,
    company: contact.company,
    linkedInUrl: contact.linkedInUrl,
    jobTitle: contact.jobTitle ?? "",
    notes: contact.notes ?? "",
    statusId: contact.statusId,
    nextFollowUpDate: (toDateInputValue(contact.nextFollowUpDate) || "") as string,
    jobApplicationId: contact.jobApplicationId ?? "",
  };
}

export function ContactFormSheet({
  open,
  onOpenChange,
  statuses,
  contact,
  jobOptions,
  companies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: ReferralContactStatus[];
  /** Pass a contact to edit it; omit to create a new one. */
  contact?: ReferralContact | null;
  jobOptions: JobOption[];
  /** Existing company names, for the autocomplete suggestions on the Company field. */
  companies: string[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [dupWarning, setDupWarning] = React.useState<null | "name" | "linkedin">(null);
  const [activity, setActivity] = React.useState<ReferralContactActivity[]>([]);
  const [newNote, setNewNote] = React.useState("");
  const [addingNote, setAddingNote] = React.useState(false);
  const isEdit = !!contact;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReferralContactFormInput>({
    resolver: zodResolver(referralContactFormSchema),
    defaultValues: contact ? valuesFromContact(contact) : emptyValues(statuses[0]?.id ?? ""),
  });

  React.useEffect(() => {
    if (open) {
      reset(contact ? valuesFromContact(contact) : emptyValues(statuses[0]?.id ?? ""));
      setDupWarning(null);
      if (contact) {
        listContactActivity(contact.id).then(setActivity).catch(() => setActivity([]));
      } else {
        setActivity([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  async function onSubmit(values: ReferralContactFormInput) {
    setSubmitting(true);
    try {
      if (isEdit && contact) {
        const updated = await updateReferralContact(contact.id, values);
        toast.success("Contact updated", { description: `${updated.fullName} — ${updated.company}` });
      } else {
        const result = await createReferralContact(values, { allowDuplicate: !!dupWarning });
        if (result.duplicate) {
          setDupWarning(result.reason);
          toast.warning("Possible duplicate", {
            description:
              result.reason === "linkedin"
                ? "This LinkedIn profile is already saved for this company. Save again to add anyway."
                : "You already have a contact with this name at this company. Save again to add anyway.",
          });
          setSubmitting(false);
          return;
        }
        toast.success("Contact added", { description: `${result.contact.fullName} — ${result.contact.company}` });
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!contact || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const entry = await addContactActivity(contact.id, newNote);
      setActivity((prev) => [entry, ...prev]);
      setNewNote("");
    } catch {
      toast.error("Couldn't add that note");
    } finally {
      setAddingNote(false);
    }
  }

  const statusId = watch("statusId");
  const jobApplicationId = watch("jobApplicationId");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Contact" : "Add Contact"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-6">
          <fieldset disabled={submitting} className="contents">
          {dupWarning && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              {dupWarning === "linkedin"
                ? "This LinkedIn profile is already saved for this company. Submitting again will add it anyway."
                : "You already have a contact with this name at this company. Submitting again will add it anyway."}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">
              Full Name <span className="font-normal text-muted-foreground">(optional — guessed from LinkedIn if left blank)</span>
            </Label>
            <Input id="fullName" placeholder="e.g. Priya Nair" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" list="contact-form-company-options" placeholder="e.g. Microsoft" {...register("company")} />
              <datalist id="contact-form-company-options">
                {companies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">
                Job Title <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="jobTitle" placeholder="e.g. Senior PM" {...register("jobTitle")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedInUrl">LinkedIn Profile URL</Label>
            <Input id="linkedInUrl" placeholder="https://linkedin.com/in/..." {...register("linkedInUrl")} />
            {errors.linkedInUrl && <p className="text-xs text-destructive">{errors.linkedInUrl.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusId} onValueChange={(v) => setValue("statusId", v)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextFollowUpDate">
                Follow Up On <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="nextFollowUpDate" type="date" {...register("nextFollowUpDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Link to Job Application <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select value={jobApplicationId || "none"} onValueChange={(v) => setValue("jobApplicationId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {jobOptions.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.companyName} — {j.jobTitle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Jumps you between this contact and its tracked job application.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea id="notes" rows={3} placeholder="e.g. Met at alumni meetup..." {...register("notes")} />
          </div>

          {isEdit && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Activity Log</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Asked for referral, said they'd check with their manager"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNote())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                    Log
                  </Button>
                </div>
                {activity.length > 0 && (
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2.5">
                    {activity.map((a) => (
                      <div key={a.id} className="text-xs">
                        <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — </span>
                        {a.note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : dupWarning ? "Add Anyway" : "Save Contact"}
            </Button>
          </div>
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  );
}
