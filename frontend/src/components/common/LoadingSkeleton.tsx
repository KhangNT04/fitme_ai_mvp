import { Skeleton } from "@/components/ui/skeleton";
import {
  catalogProductGridClass,
  catalogProductRowClass,
  catalogProductRowItemClass,
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  type?: "card" | "list" | "detail" | "brand-rows";
  className?: string;
}

/** Discover-shaped placeholders so first paint matches brand rows (avoids empty gap + CLS). */
function BrandRowsSkeleton({ rows = 3, cardsPerRow = 5, className }: {
  rows?: number;
  cardsPerRow?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-10", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, row) => (
        <section key={row}>
          <div className="mb-2.5 flex items-center gap-2 border-b border-border/40 pb-2">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className={catalogProductRowClass}>
            {Array.from({ length: cardsPerRow }).map((__, card) => (
              <div key={card} className={catalogProductRowItemClass}>
                <div className="space-y-2">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LoadingSkeleton({ count = 6, type = "card", className }: LoadingSkeletonProps) {
  if (type === "brand-rows") {
    return <BrandRowsSkeleton rows={Math.min(Math.max(count, 2), 4)} className={className} />;
  }

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
