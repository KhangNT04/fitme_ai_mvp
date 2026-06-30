import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const scrollToolbarClasses =
  "mb-3 rounded-xl border border-border/60 bg-white shadow-sm sm:mb-4 sm:rounded-2xl";

export const stickyToolbarClasses = cn(
  scrollToolbarClasses,
  "sticky top-16 z-30 w-full",
);

export const stickyToolbarSectionClasses = "px-3 py-2 sm:px-5 sm:py-3.5";

export const stickyToolbarFiltersClasses =
  "flex flex-wrap items-center gap-2 border-t border-border/40 sm:gap-2.5";

interface StickyToolbarProps {
  children: React.ReactNode;
  className?: string;
  /** Pin below main nav while scrolling. Default true. */
  pinned?: boolean;
  /** Shrunken sticky state after scrolling past page title */
  compact?: boolean;
}

export const StickyToolbar = forwardRef<HTMLDivElement, StickyToolbarProps>(function StickyToolbar(
  { children, className, pinned = true, compact },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        pinned ? stickyToolbarClasses : scrollToolbarClasses,
        compact && pinned && "shadow-md",
        "transition-shadow duration-200",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[inherit]">{children}</div>
    </div>
  );
});

interface StickyToolbarSectionProps {
  children: React.ReactNode;
  className?: string;
  filters?: boolean;
}

export function StickyToolbarSection({ children, className, filters }: StickyToolbarSectionProps) {
  return (
    <div
      className={cn(
        stickyToolbarSectionClasses,
        filters && stickyToolbarFiltersClasses,
        className,
      )}
    >
      {children}
    </div>
  );
}
