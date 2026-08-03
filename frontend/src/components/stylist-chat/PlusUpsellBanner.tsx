"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { entitlementApi } from "@/services/entitlement-api";

export function PlusUpsellBanner() {
  const { data } = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.get(),
    staleTime: 60_000,
  });

  if (!data || data.plus) return null;

  return (
    <div className="mb-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
      <span className="font-medium text-foreground">{data.label}:</span> {data.mixPolicy}.{" "}
      {data.upsellMessage}{" "}
      <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
        Bật Plus trên /pricing
      </Link>
    </div>
  );
}
