"use client";

import Link from "next/link";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";
import { cn } from "@/lib/utils";

/**
 * Link to the pricing page that disappears when the admin hides the paid consumer plans.
 * Used everywhere an upgrade call-to-action is rendered.
 */
export function PricingLink({
  href = "/pricing",
  className,
  children,
  "data-testid": testId,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  const { showPaid } = usePricingVisibility();
  if (!showPaid) return null;
  return (
    <Link href={href} className={cn(className)} data-testid={testId}>
      {children}
    </Link>
  );
}
