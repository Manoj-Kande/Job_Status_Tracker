import Link from "next/link";

const CARDS = [
  { key: "toApply", label: "To Apply", href: "/applications" },
  { key: "referralPending", label: "Referral Pending", href: "/applications?view=kanban" },
  { key: "applied", label: "Applied", href: "/applications" },
  { key: "interviewing", label: "Interviewing", href: "/applications?view=kanban" },
  { key: "offers", label: "Offers", href: "/applications?view=kanban" },
] as const;

export function SummaryCards({ summary }: { summary: Record<(typeof CARDS)[number]["key"], number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
        >
          <p className="text-2xl font-semibold">{summary[card.key]}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </Link>
      ))}
    </div>
  );
}
