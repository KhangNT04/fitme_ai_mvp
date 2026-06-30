"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/layout/BackLink";
import { StickyToolbar, StickyToolbarSection } from "@/components/layout/StickyToolbar";
import { CollapsingHeaderContext } from "@/hooks/use-collapsing-header";
import { useScrollCompact } from "@/hooks/use-scroll-compact";
import { cn } from "@/lib/utils";

export interface CollapsingPageHeaderProps {
  title: string;
  subtitle?: string;
  showAiBadge?: boolean;
  backHref?: string;
  backLabel?: string;
  className?: string;
  /** Controls on the right of the title row (stepper, search, filters). */
  trailing?: ReactNode;
  /** @deprecated Use `trailing` — kept for callers that still pass trailingCompact */
  trailingCompact?: ReactNode;
  /** Show sticky back button on mobile when there is no trailing toolbar */
  showMobileBack?: boolean;
}

export function CollapsingPageHeader({
  title,
  subtitle,
  showAiBadge,
  backHref,
  backLabel,
  className,
  trailing,
  trailingCompact,
  showMobileBack = false,
}: CollapsingPageHeaderProps) {
  const { headerRef, compact } = useScrollCompact();
  const inlineTrailing = trailingCompact ?? trailing;
  const showMobileToolbar = !!inlineTrailing;
  const showMobileBar = showMobileToolbar || (showMobileBack && !!backHref);
  const pinnedTopClass = "top-16";

  return (
    <CollapsingHeaderContext.Provider value={{ scrollCompact: compact }}>
      {!showMobileBar && <h1 className="sr-only sm:hidden">{title}</h1>}

      <div className={cn("contents", !showMobileBar && "max-sm:hidden")}>
        <StickyToolbar
          ref={headerRef}
          compact={compact}
          pinnedTopClass={pinnedTopClass}
          className={cn("mb-3 sm:mb-4", className)}
        >
          <StickyToolbarSection
            className={cn("transition-[padding] duration-200", compact ? "py-1.5 sm:py-2" : "py-1.5 sm:py-3")}
          >
            {/* Mobile: back + controls only */}
            <div className={cn("flex min-w-0 items-center gap-2", showMobileBar ? "sm:hidden" : "hidden")}>
              {backHref && (
                <BackLink
                  href={backHref}
                  label={backLabel}
                  solid
                  compact
                  className="mb-0 shrink-0"
                />
              )}
              {showMobileToolbar && <h1 className="sr-only">{title}</h1>}
              {inlineTrailing && (
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1">{inlineTrailing}</div>
              )}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block">
              {backHref && !compact && (
                <BackLink
                  href={backHref}
                  label={backLabel}
                  solid
                  compact
                  className="mb-2 max-w-[40%] truncate"
                />
              )}

              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {backHref && compact && (
                  <BackLink
                    href={backHref}
                    label={backLabel}
                    solid
                    compact
                    iconOnly
                    className="mb-0 shrink-0"
                  />
                )}

                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <h1
                    className={cn(
                      "truncate font-display font-bold tracking-tight text-foreground",
                      compact ? "text-sm sm:text-base" : "text-base sm:text-xl",
                    )}
                  >
                    {title}
                  </h1>
                  {showAiBadge && (
                    <Badge
                      variant="ai"
                      className={cn("shrink-0", compact ? "px-1.5 py-0 text-[10px]" : "text-xs")}
                    >
                      AI
                    </Badge>
                  )}
                </div>

                {inlineTrailing && (
                  <div className="flex shrink-0 items-center justify-end gap-1">{inlineTrailing}</div>
                )}
              </div>

              {subtitle && !compact && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </StickyToolbarSection>
        </StickyToolbar>
      </div>
    </CollapsingHeaderContext.Provider>
  );
}
