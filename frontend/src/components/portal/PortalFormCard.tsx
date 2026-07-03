import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { portalFormCardClass, portalWarningCardClass } from "@/lib/design-tokens";

export function PortalFormCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(portalFormCardClass, className)}>{children}</div>;
}

export function PortalWarningCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(portalWarningCardClass, className)}>{children}</div>;
}
