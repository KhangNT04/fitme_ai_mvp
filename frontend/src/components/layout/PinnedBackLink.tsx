"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { StickyToolbar, StickyToolbarSection } from "@/components/layout/StickyToolbar";
import { shouldPinBackLink } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

interface PinnedBackLinkProps {
  href: string;
  label?: string;
  className?: string;
  solid?: boolean;
  compact?: boolean;
}

export function PinnedBackLink({ href, label, className, solid, compact }: PinnedBackLinkProps) {
  const pathname = usePathname();
  const pinned = shouldPinBackLink(pathname);

  if (!pinned) {
    return (
      <BackLink href={href} label={label} className={className} solid={solid} compact={compact} />
    );
  }

  return (
    <StickyToolbar className={cn("z-30", className)}>
      <StickyToolbarSection className="py-1.5 sm:py-2">
        <BackLink
          href={href}
          label={label}
          solid={solid ?? true}
          compact={compact ?? true}
          className="mb-0"
        />
      </StickyToolbarSection>
    </StickyToolbar>
  );
}
