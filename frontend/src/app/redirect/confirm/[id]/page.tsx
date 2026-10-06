"use client";

import { use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShoppingBag, Info } from "lucide-react";
import { productApi } from "@/services/product-api";
import { redirectApi } from "@/services/redirect-api";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { formatPrice } from "@/utils/format-price";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { buyClickContextFromSearch } from "@/lib/redirect-href";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";

const BUY_CLICK_ERROR_FALLBACK = "Không thể mở nơi bán lúc này. Vui lòng thử lại.";

export default function RedirectConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PageSuspense>
      <RedirectConfirmContent params={params} />
    </PageSuspense>
  );
}

function RedirectConfirmContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyContext = useMemo(() => buyClickContextFromSearch(searchParams), [searchParams]);
  const { ensureSession } = useEnsureSession();
  const [loading, setLoading] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id),
  });

  const handleRedirect = async () => {
    setLoading(true);
    setRedirectError(null);
    try {
      const session = await ensureSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const result = await redirectApi.trackBuyClick({ productId: id, ...buyContext });
      router.push(`/redirect/loading?event=${encodeURIComponent(result.eventId)}`);
    } catch (e) {
      const message = getUserErrorMessage(e, BUY_CLICK_ERROR_FALLBACK);
      setRedirectError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  const backHref = buyContext.tryOnRequestId
    ? `/try-on/decision/${buyContext.tryOnRequestId}`
    : `/products/${id}`;
  const backLabel = buyContext.tryOnRequestId ? "Quyết định tiếp theo" : "Thông tin sản phẩm";

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton count={1} />
      </PageShell>
    );
  }

  if (error || !product) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Xác nhận chuyển hướng"
        subtitle="Bạn sắp được chuyển đến nơi bán sản phẩm"
        backHref={backHref}
        backLabel={backLabel}
        showMobileBack
      />

      <div className="w-full space-y-3 sm:space-y-4">
        <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">Sản phẩm</h2>
          </div>
          <div className="px-3 py-3 sm:px-5 sm:py-4">
            <p className="text-xs text-muted-foreground sm:text-sm">{product.brandName}</p>
            <p className="mt-0.5 font-display text-base font-bold text-foreground sm:text-lg">{product.name}</p>
            <p className="mt-2 text-lg font-semibold text-foreground sm:text-xl">{formatPrice(product.price)}</p>
          </div>
        </section>

        <div className="flex gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground sm:p-4 sm:text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Thanh toán và đơn hàng được xử lý bởi shop/sàn bán hàng. FitMe AI không xử lý thanh toán.
          </p>
        </div>

        <Button
          className="min-h-11 w-full rounded-full sm:w-auto"
          size="lg"
          onClick={handleRedirect}
          disabled={loading}
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
          {loading ? "Đang xử lý..." : "Tiếp tục đến nơi bán"}
        </Button>
        {redirectError && (
          <p role="alert" className="text-sm text-red-600">
            {redirectError}
          </p>
        )}
      </div>
    </PageShell>
  );
}
