"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { recommendationApi } from "@/services/recommendation-api";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";

export default function SimilarProductsPage() {
  return (
    <PageSuspense>
      <SimilarProductsContent />
    </PageSuspense>
  );
}

function SimilarProductsContent() {
  const searchParams = useSearchParams();
  const recommendationId = searchParams.get("recommendation");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["similar-products", recommendationId],
    queryFn: () => recommendationApi.getSimilarProducts(recommendationId!),
    enabled: !!recommendationId,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Sản phẩm tương tự</h1>
      <p className="mt-2 text-stone-500">Gợi ý sản phẩm phù hợp với outfit của bạn</p>

      <div className="mt-8">
        {!recommendationId && (
          <EmptyState title="Không có dữ liệu" description="Vui lòng truy cập từ trang kết quả AI." />
        )}
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="Không tìm thấy sản phẩm tương tự" />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
