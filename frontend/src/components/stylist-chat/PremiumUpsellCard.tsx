"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { entitlementApi } from "@/services/entitlement-api";
import { premiumUpgradeCta } from "@/lib/premium";

export function PremiumUpsellCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.getCurrent(),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.premium) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-foreground">{data.label}: {data.mixPolicy}</p>
          {data.upsellMessage && (
            <p className="text-xs text-muted-foreground">{data.upsellMessage}</p>
          )}
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href="/pricing">{premiumUpgradeCta(data.premiumPriceVnd)}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
