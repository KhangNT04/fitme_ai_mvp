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

export default function RedirectConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id),
  });

  const handleRedirect = async () => {
    setLoading(true);
    try {
      const result = await redirectApi.trackBuyClick({
        productId: id,
        sourcePage: "PRODUCT_DETAIL",
      });
      router.push(`/redirect/loading?url=${encodeURIComponent(result.redirectUrl)}&event=${result.eventId}`);
    } catch {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="mx-auto max-w-md px-4 py-8"><LoadingSkeleton count={1} /></div>;
  if (error || !product) return <div className="mx-auto max-w-md px-4 py-8"><ErrorState onRetry={() => refetch()} /></div>;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Xác nhận chuyển hướng</h1>
      <p className="mt-2 text-stone-500">Bạn sắp được chuyển đến nơi bán sản phẩm</p>

      <Card className="mt-8">
        <CardContent className="p-6">
          <p className="text-sm text-stone-500">{product.brandName}</p>
          <h2 className="mt-1 font-semibold text-stone-900">{product.name}</h2>
          <p className="mt-2 text-lg font-bold">{formatPrice(product.price)}</p>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
        Thanh toán và đơn hàng được xử lý bởi shop/sàn bán hàng.
        FitMe AI không xử lý thanh toán.
      </div>

      <Button className="mt-6 w-full" size="lg" onClick={handleRedirect} disabled={loading}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {loading ? "Đang xử lý..." : "Tiếp tục đến nơi bán"}
      </Button>
    </div>
  );
}
