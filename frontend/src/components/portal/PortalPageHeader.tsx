"use client";

import type { ReactNode } from "react";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { cn } from "@/lib/utils";

interface PortalPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  backHref?: string;
  backLabel?: string;
  showMobileBack?: boolean;
}

/** Portal page title — same CollapsingPageHeader pattern as consumer pages. */
export function PortalPageHeader({
  title,
  description,
  children,
  className,
  backHref,
  backLabel,
  showMobileBack,
}: PortalPageHeaderProps) {
  return (
    <CollapsingPageHeader
      title={title}
      subtitle={description}
      trailing={children}
      className={cn("mb-0", className)}
      backHref={backHref}
      backLabel={backLabel}
      showMobileBack={showMobileBack ?? !!backHref}
    />
  );
}
