import { Fraunces } from "next/font/google";
import { Topbar } from "@/components/layout/topbar";
import { ReferralContactsView } from "@/components/referral-contacts/referral-contacts-view";
import { requireUser } from "@/lib/auth";
import { getReferralStatuses, listReferralContacts, listJobApplicationsForLinking } from "@/lib/referral-contacts/queries";
import { getReferralStatCards } from "@/lib/referral-contacts/stat-cards-queries";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500"] });

export default async function ReferralContactsPage() {
  const user = await requireUser();

  // A single cached read of everything the page needs. Search, sort,
  // status filtering, and pagination all happen client-side against this
  // one array (see ReferralContactsView) — no server round trip per
  // filter change, so this is the only query the DB sees until something
  // is actually created/edited/deleted.
  const [statuses, contacts, jobOptions] = await Promise.all([
    getReferralStatuses(user.id),
    listReferralContacts(user.id),
    listJobApplicationsForLinking(user.id),
  ]);
  const statCards = await getReferralStatCards(user.id, statuses);

  return (
    <>
      <Topbar title="Referral Contacts" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <div>
          <h1 className={`${fraunces.className} text-2xl leading-tight text-[#201E1B] dark:hidden`}>
            Your referral network
          </h1>
          <h1 className="hidden text-xl font-semibold text-foreground dark:block">
            Your referral network
          </h1>
          <p className="mt-1 max-w-prose text-sm text-[#5B574F] dark:text-muted-foreground">
            Every introduction is a link in the chain to your next role — track who to ask, who&apos;s replied, and
            who&apos;s still open.
          </p>
        </div>

        <ReferralContactsView contacts={contacts} statuses={statuses} statCards={statCards} jobOptions={jobOptions} />
      </main>
    </>
  );
}
