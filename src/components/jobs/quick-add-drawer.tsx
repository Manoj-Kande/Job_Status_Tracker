"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { quickAddSchema, type QuickAddInput } from "@/lib/validations/job.schema";
import { quickAddJob } from "@/actions/job.actions";

const defaultValues: QuickAddInput = { companyName: "", jobPostingUrl: "", savedForLater: false };

/** Collapsible section, reused by the full edit drawer for its grouped fields. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium">
        {title}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border px-3 py-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Deliberately minimal: company name, job URL, and a queue checkbox.
 * Nothing is required. The idea is to capture a job in a couple of
 * seconds; everything else (title, location, salary, recruiter info...)
 * gets filled in later from the job's edit drawer once it's sitting in
 * the Later queue or the applications list/kanban.
 */
export function QuickAddDrawer() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<QuickAddInput>({ resolver: zodResolver(quickAddSchema), defaultValues });

  // Keyboard shortcut: "c" opens Quick Add (ignored while typing in a field)
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key.toLowerCase() === "c" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function onSubmit(values: QuickAddInput) {
    setSubmitting(true);
    try {
      const job = await quickAddJob(values);
      toast.success(values.savedForLater ? "Saved to queue" : "Job added", {
        description: `${job.companyName} — add the rest of the details anytime from ${values.savedForLater ? "Later" : "the list"}.`,
      });
      reset(defaultValues);
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        toast.error("Sign in to save this job", { description: "You'll need to re-enter it after signing in." });
        router.push("/sign-in");
      } else {
        toast.error("Couldn't save the job. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick Add Job</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" placeholder="e.g. Acme Corp" {...register("companyName")} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobPostingUrl">Job URL</Label>
            <Input id="jobPostingUrl" placeholder="https://..." {...register("jobPostingUrl")} />
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <Checkbox
              id="savedForLater"
              checked={watch("savedForLater")}
              onCheckedChange={(v) => setValue("savedForLater", !!v)}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="savedForLater" className="cursor-pointer">
                Apply later (save to queue)
              </Label>
              <p className="text-xs text-muted-foreground">
                Keep it out of your kanban board until you&apos;re ready to apply.
              </p>
            </div>
          </div>

          <Section title="Add more details (optional)">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={watch("priority") ?? undefined} onValueChange={(v) => setValue("priority", v as QuickAddInput["priority"])}>
                <SelectTrigger><SelectValue placeholder="Medium" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
            </div>
            <div className="space-y-1.5">
              <Label>Work mode</Label>
              <Select value={watch("workMode") ?? undefined} onValueChange={(v) => setValue("workMode", v as QuickAddInput["workMode"])}>
                <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                  <SelectItem value="ONSITE">Onsite</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="applicationDeadline">Application deadline</Label>
              <Input id="applicationDeadline" type="date" {...register("applicationDeadline")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryRange">Salary range</Label>
              <Input id="salaryRange" {...register("salaryRange")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descriptionNotes">Notes</Label>
              <Textarea id="descriptionNotes" rows={3} {...register("descriptionNotes")} />
            </div>
          </Section>

          <p className="text-xs text-muted-foreground">
            That&apos;s it for now — you can fill in title and everything else later from the queue or the list view.
          </p>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : watch("savedForLater") ? "Save to queue" : "Save job"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
