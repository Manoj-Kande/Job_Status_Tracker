"use client";

import { Fraunces } from "next/font/google";
import { Settings2 } from "lucide-react";
import type { ReferralStatCard } from "@prisma/client";
import { Button } from "@/components/ui/button";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });

type ContactLite = { statusId: string };

/**
 * Card strip above the contact list: an always-first "Total contacts" card
 * plus one card per user-defined ReferralStatCard, each counting contacts
 * whose statusId is one of that card's statusIds. Cards are fully
 * user-managed (add/rename/reorder/delete, remap which statuses count
 * toward which card) via the "Customize" button, so this component only
 * ever counts — it holds no fixed notion of "ready/waiting/positive".
 *
 * Colors intentionally hard-code the design mockup's cream/teal palette in
 * light mode (that's the explicit ask), and fall back to the app's normal
 * card/border/primary tokens in dark mode.
 */
export function ReferralStatsStrip({
  statCards,
  contacts,
  onCustomize,
}: {
  statCards: ReferralStatCard[];
  contacts: ContactLite[];
  onCustomize: () => void;
}) {
  const total = contacts.length;

  const cards = statCards.map((card) => ({
    id: card.id,
    label: card.label,
    value: contacts.filter((c) => card.statusIds.includes(c.statusId)).length,
  }));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          className="rounded-2xl border p-4 shadow-sm
            bg-[#1F6F5C] border-[#1F6F5C] text-white
            dark:bg-primary dark:border-primary dark:text-primary-foreground"
        >
          <div className={`${fraunces.className} text-2xl leading-none`}>{total}</div>
          <div className="mt-1.5 text-xs text-white/78 dark:text-primary-foreground/78">Total contacts</div>
        </div>

        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl border p-4 shadow-sm
              bg-white border-[#E5E2D9] text-[#201E1B]
              dark:bg-card dark:border-border dark:text-card-foreground"
          >
            <div className={`${fraunces.className} text-2xl leading-none`}>{card.value}</div>
            <div className="mt-1.5 text-xs text-[#5B574F] dark:text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" onClick={onCustomize}>
          <Settings2 className="size-3.5" /> Customize cards
        </Button>
      </div>
    </div>
  );
}
