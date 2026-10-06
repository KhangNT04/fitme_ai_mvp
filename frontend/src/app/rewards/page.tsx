"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Gift, Share2, Star, Coins, Calendar, Ticket } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fitkenApi } from "@/services/fitken-api";
import { rewardsApi } from "@/services/rewards-api";
import { voucherApi } from "@/services/voucher-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format-price";
import { DEFAULT_SHARE_REWARD_FITKEN } from "@/utils/constants";
import { shareClaimSuccessMessage } from "@/lib/share-reward";

const VOUCHER_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Có thể dùng",
  RESERVED: "Đang giữ",
  USED: "Đã dùng",
  EXPIRED: "Hết hạn",
};

const REWARD_TABS = ["tasks", "vouchers", "history"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export default function RewardsPage() {
  return (
    <PageSuspense>
      <RewardsContent />
    </PageSuspense>
  );
}

function RewardsContent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const galleryImageId = searchParams.get("galleryImageId") ?? undefined;
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && REWARD_TABS.includes(requestedTab) ? requestedTab : "tasks";
  const [shareUrl, setShareUrl] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["fitken-wallet"],
    queryFn: () => fitkenApi.getWallet(),
    enabled: isAuthenticated,
  });

  const { data: summary } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: () => rewardsApi.getSummary(),
    enabled: isAuthenticated,
  });

  const { data: ledger } = useQuery({
    queryKey: ["fitken-ledger"],
    queryFn: () => fitkenApi.getLedger(),
    enabled: isAuthenticated,
  });

  const { data: vouchers } = useQuery({
    queryKey: ["my-vouchers"],
    queryFn: () => voucherApi.getMyVouchers(),
    enabled: isAuthenticated,
  });

  const checkinMutation = useMutation({
    mutationFn: () => rewardsApi.checkin(),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-ledger"] });
      if (res.rewardGranted > 0) {
        toast.success(`Điểm danh thành công! Bạn nhận được ${res.rewardGranted} Fitken.`);
      } else {
        toast.success("Điểm danh thành công!");
      }
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không thể điểm danh.")),
  });

  const shareMutation = useMutation({
    mutationFn: (postUrl: string) => rewardsApi.claimShare({ postUrl, galleryImageId }),
    onSuccess: (res) => {
      setShareUrl("");
      void queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-ledger"] });
      toast.success(shareClaimSuccessMessage(res.rewardGranted));
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Gửi link thất bại.")),
  });

  if (!isAuthenticated) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <CollapsingPageHeader title="Nhận thưởng" backHref="/profile" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gift className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Đăng nhập để nhận thưởng</h2>
          <p className="text-muted-foreground mb-6">
            Làm nhiệm vụ mỗi ngày để nhận Fitken miễn phí.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/auth/login?redirect=/rewards">Đăng nhập ngay</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const showUpsell = wallet !== undefined && wallet.plan !== "PRO";

  return (
    <PageShell width="full" className={cn(consumerPageShellClass, "space-y-6")}>
      <CollapsingPageHeader title="Nhận thưởng" backHref="/profile" />

      {/* Hero Balance */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-6 text-center shadow-md relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Coins className="w-32 h-32" />
        </div>
        <p className="text-primary-foreground/80 text-sm font-medium mb-1">Số dư Fitken</p>
        <div className="text-5xl font-bold mb-4">{wallet?.balance ?? "—"}</div>
        
        {showUpsell && (
          <div className="bg-primary-foreground/10 rounded-xl p-3 text-sm flex items-center justify-between">
            <span className="text-left">Nâng cấp Pro để nhận 15 Fitken/tháng</span>
            <Button asChild size="sm" variant="secondary" className="rounded-full shrink-0">
              <Link href="/pricing">Nâng cấp</Link>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="tasks">Nhiệm vụ</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* Check-in */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Điểm danh hàng ngày</h3>
                <p className="text-xs text-muted-foreground">
                  Chuỗi {summary?.checkin.currentStreak ?? 0}/{summary?.checkin.streakTarget ?? 3} ngày (+{summary?.checkin.rewardAmount ?? 1} Fitken)
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full"
                disabled={!summary || summary.checkin.checkedInToday || checkinMutation.isPending}
                onClick={() => checkinMutation.mutate()}
              >
                {summary?.checkin.checkedInToday ? "Đã điểm danh" : "Điểm danh"}
              </Button>
            </div>
            
            {/* 7-day strip mockup */}
            <div className="flex justify-between mt-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const isPast = i < (summary?.checkin.currentStreak ?? 0);
                const isToday = i === (summary?.checkin.currentStreak ?? 0) && !summary?.checkin.checkedInToday;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                      isPast ? "bg-primary text-primary-foreground" : 
                      isToday ? "border-2 border-primary text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {isPast ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    {(i + 1) % (summary?.checkin.streakTarget ?? 3) === 0 && (
                      <Gift className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Chia sẻ mạng xã hội</h3>
                <p className="text-xs text-muted-foreground">
                  +{summary?.share.rewardAmount ?? DEFAULT_SHARE_REWARD_FITKEN} Fitken/lần (còn {summary?.share.remainingToday ?? 0}/{summary?.share.dailyLimit ?? 0} lần hôm nay)
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              Chia sẻ ảnh Try-on lên Facebook/Instagram/TikTok ở chế độ công khai, sau đó dán link bài viết vào đây.
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="https://facebook.com/..."
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                className="rounded-full"
              />
              <Button 
                className="rounded-full shrink-0"
                disabled={!summary || !shareUrl || shareMutation.isPending || summary.share.remainingToday === 0}
                onClick={() => shareMutation.mutate(shareUrl)}
              >
                Gửi link
              </Button>
            </div>

            {summary?.share.recentClaims && summary.share.recentClaims.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Lịch sử gửi link</p>
                {summary.share.recentClaims.map((claim) => (
                  <div key={claim.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/30">
                    <span className="truncate max-w-[150px] text-muted-foreground">{claim.postUrl}</span>
                    <Badge variant={claim.status === "APPROVED" ? "success" : claim.status === "REJECTED" ? "warning" : "secondary"}>
                      {claim.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Star className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Đánh giá sản phẩm</h3>
                <p className="text-xs text-muted-foreground">
                  +{summary?.review.rewardAmount ?? 2} Fitken/lần (còn {summary?.review.remainingToday ?? 0}/{summary?.review.dailyLimit ?? 1} lần hôm nay)
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Viết đánh giá chi tiết (tối thiểu {summary?.review.minContentLength ?? 20} ký tự) kèm hình ảnh cho các sản phẩm bạn đã mua. Mỗi ngày nhận thưởng cho 1 đánh giá.
            </p>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/orders">Đến Đơn hàng của tôi</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="vouchers">
          {vouchers && vouchers.length > 0 ? (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">Voucher Freeship</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      Giảm phí vận chuyển tối đa {formatPrice(v.maxDiscountVnd)}
                    </p>
                    {v.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-1">HSD: {formatDate(v.expiresAt)}</p>
                    )}
                  </div>
                  <Badge variant={v.status === "AVAILABLE" ? "success" : "secondary"}>
                    {VOUCHER_STATUS_LABEL[v.status] ?? v.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border rounded-2xl bg-muted/20">
              <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-20" />
              <p className="text-muted-foreground">Bạn chưa có voucher nào.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {ledger && ledger.items.length > 0 ? (
            <div className="space-y-2">
              {ledger.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div>
                    <p className="text-sm font-medium">{item.note}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <div className={cn("font-bold", item.delta > 0 ? "text-green-600" : "text-red-600")}>
                    {item.delta > 0 ? "+" : ""}{item.delta}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Chưa có giao dịch nào.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
