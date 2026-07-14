"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// `next/dynamic` with `ssr: false` is only allowed inside Client Components,
// so these wrappers live here instead of in the (server) analytics page.
export const SourceBarChart = dynamic(() => import("@/components/analytics/charts").then((m) => m.SourceBarChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

export const DirectVsReferralPie = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.DirectVsReferralPie),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full" />,
  }
);

export const StatusFunnelBarChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.StatusFunnelBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full" />,
  }
);
