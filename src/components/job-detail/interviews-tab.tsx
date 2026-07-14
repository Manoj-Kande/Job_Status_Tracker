"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import type { InterviewRound, InterviewType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { MessagesSquare } from "lucide-react";
import { createInterviewRound } from "@/actions/interview.actions";
import { parseDateInput } from "@/lib/utils";

const OUTCOME_VARIANT = {
  PENDING: "secondary",
  CLEARED: "success",
  REJECTED: "destructive",
  WAITING_FOR_UPDATE: "warning",
} as const;

const INTERVIEW_TYPES: InterviewType[] = [
  "HR", "TECHNICAL", "CODING", "SYSTEM_DESIGN", "MANAGERIAL", "HIRING_MANAGER", "FINAL", "OTHER",
];

export function InterviewsTab({ jobId, rounds }: { jobId: string; rounds: InterviewRound[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<InterviewType>("TECHNICAL");
  const [date, setDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createInterviewRound(jobId, {
        roundName: name.trim(),
        roundNumber: rounds.length + 1,
        interviewType: type,
        interviewDateTime: date ? parseDateInput(date) : undefined,
      });
      toast.success("Interview round added");
      setName("");
      setDate("");
      router.refresh();
    } catch {
      toast.error("Couldn't add round");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {rounds.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No interview rounds yet" description="Add your first round below." />
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <div key={round.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Round {round.roundNumber} · {round.roundName}</p>
                <p className="text-xs text-muted-foreground">
                  {round.interviewDateTime ? format(round.interviewDateTime, "MMM d, yyyy") : "Unscheduled"} ·{" "}
                  {round.interviewType.replaceAll("_", " ")}
                </p>
              </div>
              <Badge variant={OUTCOME_VARIANT[round.outcome]}>{round.outcome.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <Label className="text-xs text-muted-foreground">Add interview round</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Round name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as InterviewType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {INTERVIEW_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replaceAll("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()}>
          {saving ? "Adding..." : "Add round"}
        </Button>
      </div>
    </div>
  );
}
