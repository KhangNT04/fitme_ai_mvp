"use client";

import Link from "next/link";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";

/**
 * Link to the pricing page that disappears when the admin hides the paid plans.
 * Kept as a client component so server-rendered footers can use it.
 */
export function PricingFooterLink({
  className,
  children = "Bảng giá FitMe Premium",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { showPaid } = usePricingVisibility();
  if (!showPaid) return null;
  return (
    <Link href="/pricing" className={className}>
      {children}
    </Link>
  );
}
