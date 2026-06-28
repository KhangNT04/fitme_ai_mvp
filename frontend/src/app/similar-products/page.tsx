"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { recommendationApi } from "@/services/recommendation-api";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

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
    <PageShell width="full">
      <PageHeader
        title="Sản phẩm tương tự"
        subtitle="Gợi ý sản phẩm phù hợp với outfit của bạn"
        backHref={recommendationId ? `/ai/result/${recommendationId}` : "/discover"}
        backLabel={recommendationId ? "Kết quả tư vấn" : "Khám phá sản phẩm"}
      />

      <div>
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
    </PageShell>
  );
}
