import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </main>
  );
}
