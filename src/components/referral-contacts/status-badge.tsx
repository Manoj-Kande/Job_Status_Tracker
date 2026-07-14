import { colorsForStatus } from "@/lib/referral-contacts/status-meta";

export function ReferralStatusBadge({ label }: { label: string }) {
  const [bg, fg] = colorsForStatus(label);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {label}
    </span>
  );
}
