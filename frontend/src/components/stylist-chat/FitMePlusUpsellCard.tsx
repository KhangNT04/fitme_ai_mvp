"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { entitlementApi } from "@/services/entitlement-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

/**
 * Soft Free vs Plus upsell — stub entitlement until consumer PayOS.
 */
export function FitMePlusUpsellCard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.getCurrent(),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.plus) {
    return null;
  }

  const onTryPlus = async () => {
    if (!isAuthenticated) {
      toast.info("Đăng nhập để bật FitMe Plus (demo gói curated cùng brand).");
      return;
    }
    try {
      await entitlementApi.setPlan("PLUS");
      await queryClient.invalidateQueries({ queryKey: ["consumer-entitlement"] });
      toast.success("Đã bật FitMe Plus — outfit sẽ ưu tiên cùng brand hơn.");
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không bật được Plus."));
    }
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-foreground">{data.label}: {data.mixPolicy}</p>
          {data.upsellMessage && (
            <p className="text-xs text-muted-foreground">{data.upsellMessage}</p>
          )}
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void onTryPlus()}>
            Thử FitMe Plus
          </Button>
        </div>
      </div>
    </div>
  );
}
