import { cn } from "@/lib/utils";

export const stickyToolbarClasses =
  "sticky top-16 z-30 mb-4 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm";

export const stickyToolbarSectionClasses = "px-4 py-3 sm:px-5 sm:py-3.5";

export const stickyToolbarFiltersClasses =
  "flex flex-wrap items-center gap-2 border-t border-border/40 sm:gap-2.5";

interface StickyToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyToolbar({ children, className }: StickyToolbarProps) {
  return <div className={cn(stickyToolbarClasses, className)}>{children}</div>;
}

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
        className
      )}
    >
      {children}
    </div>
  );
}
