"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { entitlementApi, type ConsumerPlan, type OutfitCoherenceMode } from "@/services/entitlement-api";
import { useAuthStore } from "@/stores/auth-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const FREE_PERKS = [
  "Phối lẫn nhiều brand để khám phá vibe",
  "Stylist chat + try-on cơ bản",
  "Lưu outfit & tủ đồ",
  "Tủ chi tiêu bản rút gọn",
];

const PLUS_PERKS = [
  "Ưu tiên outfit cùng brand / brand đối tác",
  "Cá nhân hóa sâu hơn từ like / lưu / click mua",
  "Badge “Cùng brand” / “Partner look” rõ ràng",
  "Tùy chọn STRICT: chỉ look cùng brand/partner",
];

export default function PricingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.get(),
    staleTime: 30_000,
  });

  const planMutation = useMutation({
    mutationFn: ({
      plan,
      coherenceMode,
    }: {
      plan: ConsumerPlan;
      coherenceMode?: OutfitCoherenceMode;
    }) => entitlementApi.setPlan(plan, coherenceMode),
    onSuccess: (next) => {
      void queryClient.invalidateQueries({ queryKey: ["consumer-entitlement"] });
      toast.success(
        next.plus
          ? `Đã bật ${next.label} (${next.coherenceMode})`
          : "Đã chuyển về FitMe Free — mix brand khám phá",
      );
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không đổi được gói.")),
  });

  const requireAuth = () => {
    if (!isAuthenticated) {
      toast.info("Đăng nhập để bật / tắt FitMe Plus (demo không cần PayOS).");
      return false;
    }
    return true;
  };

  const setPlan = (plan: ConsumerPlan, coherenceMode?: OutfitCoherenceMode) => {
    if (!requireAuth()) return;
    planMutation.mutate({ plan, coherenceMode });
  };

  const isPlus = Boolean(data?.plus);
  const isStrict = data?.coherenceMode === "STRICT";

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="FitMe Free & Plus"
        subtitle="Free khám phá nhiều brand — Plus look đồng bộ hơn"
        backHref="/ai/chat"
        backLabel="Tư vấn"
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <p className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <span className="font-medium text-foreground">Demo đồ án:</span> bật Plus ngay trên
          trang này (chưa gắn PayOS consumer). Admin cũng có thể gán gói từ portal.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            eyebrow="Free"
            title="Khám phá nhiều brand"
            active={Boolean(data) && !isPlus}
            perks={FREE_PERKS}
            footer={
              isPlus ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full rounded-full"
                  disabled={planMutation.isPending || isLoading}
                  onClick={() => setPlan("FREE")}
                >
                  Chuyển về Free
                </Button>
              ) : (
                <p className="mt-4 text-sm font-medium text-foreground">Đang dùng</p>
              )
            }
          />

          <PlanCard
            eyebrow="FitMe Plus"
            title="Outfit đồng bộ brand"
            highlighted
            active={isPlus}
            perks={PLUS_PERKS}
            footer={
              <>
                {isPlus ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-primary">Bạn đang dùng Plus</p>
                    <Badge variant="secondary" className="text-[10px]">
                      Mode: {data?.coherenceMode ?? "PREFER"}
                    </Badge>
                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        type="button"
                        variant={isStrict ? "default" : "outline"}
                        size="sm"
                        className="w-full rounded-full"
                        disabled={planMutation.isPending}
                        onClick={() => setPlan("PLUS", isStrict ? "PREFER" : "STRICT")}
                      >
                        {isStrict ? "Tắt STRICT (về PREFER)" : "Bật STRICT (opt-in)"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-full"
                        disabled={planMutation.isPending}
                        onClick={() => setPlan("FREE")}
                      >
                        Hủy Plus (demo)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    className="mt-4 w-full rounded-full"
                    disabled={planMutation.isPending || isLoading}
                    onClick={() => setPlan("PLUS", "PREFER")}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Thử FitMe Plus (demo)
                  </Button>
                )}
              </>
            }
          />
        </div>

        {!isAuthenticated && (
          <p className="text-center text-xs text-muted-foreground">
            Chưa đăng nhập?{" "}
            <Link href="/auth/login?next=/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
              Đăng nhập
            </Link>{" "}
            rồi quay lại để toggle gói.
          </p>
        )}
      </div>
    </PageShell>
  );
}

function PlanCard({
  eyebrow,
  title,
  perks,
  footer,
  highlighted,
  active,
}: {
  eyebrow: string;
  title: string;
  perks: string[];
  footer: ReactNode;
  highlighted?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        highlighted ? "border-primary/40 bg-primary/5" : "border-border/60",
        active && "ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            highlighted ? "text-primary" : "text-muted-foreground",
          )}
        >
          {eyebrow}
        </p>
        {active && (
          <Badge variant="outline" className="text-[10px]">
            Đang dùng
          </Badge>
        )}
      </div>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
