import { Skeleton } from "@/components/ui/skeleton";
import { catalogProductGridClass } from "@/lib/design-tokens";

interface LoadingSkeletonProps {
  count?: number;
  type?: "card" | "list" | "detail";
}

export function LoadingSkeleton({ count = 6, type = "card" }: LoadingSkeletonProps) {
  if (type === "detail") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={catalogProductGridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
