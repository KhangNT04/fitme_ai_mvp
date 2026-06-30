import { Skeleton } from "@/components/ui/skeleton";
import { catalogProductGridClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  type?: "card" | "list" | "detail";
  className?: string;
}

export function LoadingSkeleton({ count = 6, type = "card", className }: LoadingSkeletonProps) {
  if (type === "detail") {
    const detailGridClass = "grid gap-8 lg:grid-cols-[32rem_minmax(0,1fr)] lg:gap-10";
    return (
      <div className={cn("space-y-8", className)}>
        <div className="flex flex-col gap-8 lg:hidden">
          <Skeleton className="aspect-[3/4] w-full max-w-sm rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-52 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className={cn(detailGridClass, "items-stretch")}>
            <Skeleton className="min-h-[16rem] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
          <div className={detailGridClass}>
            <Skeleton className="h-20 w-40 rounded-xl" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-52 rounded-full" />
              <Skeleton className="h-10 w-36 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
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
