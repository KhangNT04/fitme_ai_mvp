"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Sparkles, Coins, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fitkenApi } from "@/services/fitken-api";
import { subscriptionApi } from "@/services/subscription-api";
import { useAuthStore } from "@/stores/auth-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format-price";
import { useShareRewardAmount } from "@/hooks/use-share-reward-amount";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const FREE_PERKS = [
  "5 Fitken dùng thử (tài khoản mới)",
  "Phối đồ trên bảng (miễn phí)",
  "Lưu outfit & tủ đồ",
  "Nhận thêm Fitken qua nhiệm vụ",
];

const PRO_PERKS = [
  "15 Fitken mỗi tháng",
  "Tạo ảnh AI Try-on chất lượng cao",
  "Mở khóa tính năng Pro khác",
];

export default function PricingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { data: wallet, isLoading } = useQuery({
    queryKey: ["fitken-wallet"],
    queryFn: () => fitkenApi.getWallet(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["consumer-plans"],
    queryFn: () => subscriptionApi.getPlans(),
    staleTime: 5 * 60_000,
  });
  const shareReward = useShareRewardAmount();
  const proPlan = plans?.find((p) => p.planType !== "TOPUP");
  const topupPlans = plans?.filter((p) => p.planType === "TOPUP") ?? [];

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => subscriptionApi.checkout(planId),
    onSuccess: (res) => {
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không thể tạo thanh toán.")),
  });

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để nâng cấp Pro.");
      return;
    }
    if (!proPlan) {
      toast.error("Gói Pro hiện chưa mở bán.");
      return;
    }
    checkoutMutation.mutate(proPlan.id);
  };

  const handleTopup = (planId: string) => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để mua thêm Fitken.");
      return;
    }
    checkoutMutation.mutate(planId);
  };

  const walletPending = isAuthenticated && wallet === undefined;
  const isPro = wallet?.plan === "PRO";
  const subscription = wallet?.subscription;

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="FitMe Free & Pro"
        subtitle="Nâng cấp Pro để nhận thêm Fitken mỗi tháng"
        backHref="/ai/chat"
        backLabel="Tư vấn"
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            eyebrow="Free"
            title="Miễn phí"
            active={isAuthenticated && !walletPending && !isPro}
            perks={FREE_PERKS}
            footer={
              isPro || walletPending ? null : (
                <p className="mt-4 text-sm font-medium text-foreground text-center">
                  {isAuthenticated ? "Đang dùng" : "Mặc định cho tài khoản mới"}
                </p>
              )
            }
          />

          <PlanCard
            eyebrow="FitMe Pro"
            title={`${formatPrice(proPlan?.priceVnd ?? 49000)} / tháng`}
            highlighted
            active={isPro}
            perks={PRO_PERKS}
            footer={
              <>
                {isPro ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-primary text-center">Bạn đang dùng Pro</p>
                    {subscription?.expiresAt && (
                      <p className="text-xs text-center text-muted-foreground">
                        Hết hạn: {formatDate(subscription.expiresAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    className="mt-4 w-full rounded-full"
                    disabled={checkoutMutation.isPending || isLoading || walletPending || plansLoading}
                    onClick={handleCheckout}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Nâng cấp Pro ngay
                  </Button>
                )}
              </>
            }
          />
        </div>

        {!isAuthenticated && (
          <p className="text-center text-xs text-muted-foreground">
            Chưa đăng nhập?{" "}
            <Link href="/auth/login?redirect=/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
              Đăng nhập
            </Link>{" "}
            để xem số dư Fitken và nâng cấp.
          </p>
        )}

        {topupPlans.length > 0 && (
          <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="topup-heading">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 id="topup-heading" className="text-lg font-semibold">Mua thêm Fitken</h3>
                <p className="text-sm text-muted-foreground">
                  Thanh toán một lần qua PayOS, Fitken cộng ngay vào ví và không hết hạn theo tháng.
                </p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {topupPlans.map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      +{plan.fitkenAmount} Fitken · {formatPrice(plan.priceVnd)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full"
                    disabled={checkoutMutation.isPending}
                    onClick={() => handleTopup(plan.id)}
                  >
                    Mua
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Cách nhận thêm Fitken</h3>
              <p className="text-sm text-muted-foreground">Làm nhiệm vụ để nhận Fitken miễn phí mỗi ngày</p>
            </div>
          </div>
          
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <span>Điểm danh liên tục 3 ngày</span>
              <span className="font-medium text-primary">+1 Fitken</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <span>Chia sẻ ảnh Try-on lên mạng xã hội (1 lần/ngày)</span>
              <span className="font-medium text-primary">+{shareReward} Fitken</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <span>Đánh giá sản phẩm đã mua kèm ảnh (1 lần/ngày)</span>
              <span className="font-medium text-primary">+2 Fitken</span>
            </li>
          </ul>
          
          <Button asChild variant="outline" className="w-full mt-4 rounded-full">
            <Link href="/rewards">
              Đến trang Nhận thưởng <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
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
        "flex flex-col rounded-2xl border p-5",
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
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground flex-1">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4">
        {footer}
      </div>
    </div>
  );
}
