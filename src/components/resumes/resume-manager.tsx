"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Plus, ExternalLink, Trash2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createResume, updateResume, deleteResume } from "@/actions/resume.actions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  fileUrl: z.string().trim().url("Enter a valid URL"),
  notes: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export interface JobOption {
  id: string;
  companyName: string;
  jobTitle: string;
}

export interface ResumeItem {
  id: string;
  name: string;
  fileUrl: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  jobApplications: { id: string; companyName: string; jobTitle: string; applicationStatus: string }[];
}

function ResumeForm({
  defaultValues,
  onSubmit,
  submitLabel,
  jobOptions,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues, jobApplicationId: string | null) => Promise<void>;
  submitLabel: string;
  jobOptions?: JobOption[];
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [linkedJobId, setLinkedJobId] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  async function handle(values: FormValues) {
    setSubmitting(true);
    try {
      await onSubmit(values, linkedJobId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" placeholder="e.g. Backend Engineer - v3" {...register("name")} autoFocus />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fileUrl">File URL *</Label>
        <Input id="fileUrl" placeholder="https://drive.google.com/..." {...register("fileUrl")} />
        {errors.fileUrl && <p className="text-xs text-destructive">{errors.fileUrl.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} placeholder="Optional" {...register("notes")} />
      </div>
      {jobOptions && (
        <div className="space-y-1.5">
          <Label>Link to a job (optional)</Label>
          <Combobox
            value={linkedJobId}
            onChange={setLinkedJobId}
            placeholder="Search your applications..."
            searchPlaceholder="Search company or role..."
            emptyText="No matching applications."
            options={jobOptions.map((j) => ({ value: j.id, label: j.companyName, sublabel: j.jobTitle }))}
          />
          <p className="text-xs text-muted-foreground">
            Sets this as the resume used on that application. You can change it later from the job&apos;s Application tab.
          </p>
        </div>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResumeManager({ resumes, jobOptions = [] }: { resumes: ResumeItem[]; jobOptions?: JobOption[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [search, setSearch] = React.useState("");

  async function handleCreate(values: FormValues, jobApplicationId: string | null) {
    try {
      await createResume({ ...values, jobApplicationId });
      toast.success(jobApplicationId ? "Resume added and linked" : "Resume added");
      setAddOpen(false);
      router.refresh();
    } catch {
      toast.error("Couldn't add resume. Please try again.");
    }
  }

  async function handleUpdate(id: string, values: FormValues) {
    try {
      await updateResume(id, values);
      toast.success("Resume updated");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Couldn't update resume. Please try again.");
    }
  }

  const filteredResumes = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resumes;
    return resumes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.jobApplications.some(
          (j) => j.companyName.toLowerCase().includes(q) || j.jobTitle.toLowerCase().includes(q)
        )
    );
  }, [resumes, search]);

  function handleDelete(id: string) {
    if (!confirm("Delete this resume version? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteResume(id);
        toast.success("Resume deleted");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const editing = resumes.find((r) => r.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {resumes.length} resume{resumes.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resumes or companies..."
              className="h-9 w-56 pl-8 text-sm"
            />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Add resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add resume version</DialogTitle>
              </DialogHeader>
              <ResumeForm onSubmit={handleCreate} submitLabel="Add resume" jobOptions={jobOptions} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resume versions yet"
          description="Keep track of every resume you've tailored, and see which one you used for each application."
        />
      ) : filteredResumes.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search term." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResumes.map((resume) => (
            <div key={resume.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium leading-tight">{resume.name}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingId(resume.id)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => handleDelete(resume.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {resume.notes && <p className="text-xs text-muted-foreground">{resume.notes}</p>}
              {resume.jobApplications.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Used on {resume.jobApplications.length} application{resume.jobApplications.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {resume.jobApplications.slice(0, 4).map((j) => (
                      <Link
                        key={j.id}
                        href={`/applications/${j.id}`}
                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] hover:underline"
                      >
                        {j.companyName}
                      </Link>
                    ))}
                    {resume.jobApplications.length > 4 && (
                      <span className="text-[11px] text-muted-foreground">+{resume.jobApplications.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[11px] text-muted-foreground">
                  Updated {format(resume.updatedAt, "MMM d, yyyy")}
                </span>
                <a
                  href={resume.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit resume</DialogTitle>
          </DialogHeader>
          {editing && (
            <ResumeForm
              key={editing.id}
              defaultValues={{ name: editing.name, fileUrl: editing.fileUrl, notes: editing.notes ?? undefined }}
              onSubmit={(values) => handleUpdate(editing.id, values)}
              submitLabel="Save changes"
              jobOptions={undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
