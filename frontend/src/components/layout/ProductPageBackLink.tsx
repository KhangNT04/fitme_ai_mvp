"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { StickyToolbar, StickyToolbarSection } from "@/components/layout/StickyToolbar";
import { useProductPageBack } from "@/hooks/use-product-page-back";
import { shouldPinBackLink } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

interface ProductPageBackLinkProps {
  className?: string;
}

export function ProductPageBackLink({ className }: ProductPageBackLinkProps) {
  const pathname = usePathname();
  const pinned = shouldPinBackLink(pathname);
  const { href, label } = useProductPageBack();

  const link = (
    <BackLink
      href={href}
      label={label}
      disableHistory
      solid
      compact
      className={pinned ? "mb-0" : undefined}
    />
  );

  if (!pinned) {
    return <div className={className}>{link}</div>;
  }

  return (
    <StickyToolbar className={cn("z-30", className)}>
      <StickyToolbarSection className="py-1.5 sm:py-2">{link}</StickyToolbarSection>
    </StickyToolbar>
  );
}
