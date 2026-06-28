"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { productApi } from "@/services/product-api";
import { redirectApi } from "@/services/redirect-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatPrice } from "@/utils/format-price";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function RedirectConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const [loading, setLoading] = useState(false);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id),
  });

  const handleRedirect = async () => {
    setLoading(true);
    try {
      const session = await ensureSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const result = await redirectApi.trackBuyClick({
        productId: id,
        sourcePage: "PRODUCT_DETAIL",
      });
      router.push(`/redirect/loading?url=${encodeURIComponent(result.redirectUrl)}&event=${result.eventId}`);
    } catch {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell width="narrow">
        <LoadingSkeleton count={1} />
      </PageShell>
    );
  }
  if (error || !product) {
    return (
      <PageShell width="narrow">
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <PageHeader title="Xác nhận chuyển hướng" subtitle="Bạn sắp được chuyển đến nơi bán sản phẩm" backHref={`/products/${id}`} backLabel="Chi tiết sản phẩm" />

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{product.brandName}</p>
          <h2 className="mt-1 font-semibold text-foreground">{product.name}</h2>
          <p className="mt-2 text-lg font-bold">{formatPrice(product.price)}</p>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        Thanh toán và đơn hàng được xử lý bởi shop/sàn bán hàng.
        FitMe AI không xử lý thanh toán.
      </div>

      <Button className="mt-6 w-full" size="lg" onClick={handleRedirect} disabled={loading}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {loading ? "Đang xử lý..." : "Tiếp tục đến nơi bán"}
      </Button>
    </PageShell>
  );
}
