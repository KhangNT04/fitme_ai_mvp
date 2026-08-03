"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search, ShoppingBag, Wallet } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { redirectApi, type PurchaseHistoryItem } from "@/services/redirect-api";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { formatPrice } from "@/utils/format-price";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { isSameMonth, matchesPurchaseSearch } from "./purchase-helpers";

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { ensureSession } = useEnsureSession();
  const [query, setQuery] = useState("");
  const [purchasedOnly, setPurchasedOnly] = useState(false);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["purchase-history"],
    queryFn: () => redirectApi.getHistory(),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ eventId, purchased }: { eventId: string; purchased: boolean }) =>
      redirectApi.confirmPurchased(eventId, purchased),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      toast.success("Đã cập nhật tủ chi tiêu");
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không cập nhật được.")),
  });

  const monthlySpend = useMemo(() => {
    if (!data?.items?.length) return 0;
    return data.items
      .filter((item) => item.purchasedConfirmed && isSameMonth(item.purchasedConfirmedAt || item.clickedAt))
      .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item: PurchaseHistoryItem) => {
      if (purchasedOnly && !item.purchasedConfirmed) return false;
      return matchesPurchaseSearch(item, query);
    });
  }, [data, query, purchasedOnly]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Tủ chi tiêu"
        subtitle="Click mua & nơi mua lại — đánh dấu đã mua thật để ước tính chi tiêu"
        backHref="/profile"
        backLabel="Hồ sơ"
        showMobileBack
      />

      {isLoading && <LoadingSkeleton count={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {data && (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 text-center sm:grid-cols-4 sm:gap-3 sm:p-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Click mua</p>
              <p className="mt-1 text-lg font-semibold">{data.clickCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Đã mua</p>
              <p className="mt-1 text-lg font-semibold">{data.purchasedCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Ước tính</p>
              <p className="mt-1 text-lg font-semibold">
                {formatPrice(data.estimatedSpend || 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Tháng này</p>
              <p className="mt-1 text-lg font-semibold">{formatPrice(monthlySpend)}</p>
            </div>
          </section>

          {data.items.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm brand, sản phẩm, màu…"
                  className="pl-9"
                  aria-label="Tìm trong tủ chi tiêu"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant={purchasedOnly ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setPurchasedOnly((v) => !v)}
              >
                {purchasedOnly ? "Đang lọc: đã mua" : "Chỉ đã mua"}
              </Button>
            </div>
          )}

          {data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
              <Wallet className="mx-auto h-8 w-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium">Chưa có lịch sử click mua</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Khi bạn bấm mua từ outfit, FitMe lưu lại để bạn tra cứu nơi mua.
              </p>
              <Button asChild className="mt-4 rounded-full" size="sm">
                <Link href="/ai/chat">Đi tư vấn outfit</Link>
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              Không khớp “{query || "bộ lọc"}”. Thử từ khóa khác.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {filteredItems.map((item) => (
                <li
                  key={item.eventId}
                  className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.brandName && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.brandName}
                          </Badge>
                        )}
                        {item.purchasedConfirmed && (
                          <Badge variant="secondary" className="text-[10px]">
                            Đã mua
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.price != null ? formatPrice(item.price) : "Giá chưa có"} ·{" "}
                        {item.channel || "Shop"}
                        {item.clickedAt
                          ? ` · ${new Date(item.clickedAt).toLocaleDateString("vi-VN")}`
                          : ""}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Mua lại
                          </a>
                        </Button>
                        {!item.purchasedConfirmed ? (
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={confirmMutation.isPending}
                            onClick={() =>
                              confirmMutation.mutate({ eventId: item.eventId, purchased: true })
                            }
                          >
                            Đã mua thật?
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            disabled={confirmMutation.isPending}
                            onClick={() =>
                              confirmMutation.mutate({ eventId: item.eventId, purchased: false })
                            }
                          >
                            Bỏ đánh dấu
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
