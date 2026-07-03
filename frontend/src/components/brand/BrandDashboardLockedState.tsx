import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandDashboardBlockReason } from "@/lib/brand-dashboard-access";

interface BrandDashboardLockedStateProps {
  pageLabel: string;
  reason: BrandDashboardBlockReason;
}

export function BrandDashboardLockedState({ pageLabel, reason }: BrandDashboardLockedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-16 text-center">
      <Lock className="mb-4 h-12 w-12 text-amber-600" />
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{pageLabel}</p>
      <h3 className="mt-2 font-display text-lg font-semibold text-amber-950">{reason.title}</h3>
      <p className="mt-2 max-w-lg text-sm text-amber-900">{reason.message}</p>
      <Button asChild className="mt-6">
        <Link href="/brand/billing">Xem gói &amp; thanh toán</Link>
      </Button>
    </div>
  );
}
