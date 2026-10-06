"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Layers, Shirt } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import type { ApiError } from "@/services/api-client";
import { useConsumerStoresReady } from "@/hooks/use-consumer-stores-ready";
import { AppImage } from "@/components/common/AppImage";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ChatOutfitCard } from "@/components/stylist-chat/ChatOutfitCard";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { isFromSavedList, resolveSavedResultBack } from "@/lib/nav-context";
import { getUserErrorMessage } from "@/lib/user-error-message";

function isNotFound(error: unknown): boolean {
  return (error as ApiError | null)?.status === 404;
}

export default function AiResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const back = resolveSavedResultBack("ai", isFromSavedList(searchParams));
  const storesReady = useConsumerStoresReady();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => recommendationApi.getById(id),
    enabled: storesReady,
    retry: (failureCount, err) => !isNotFound(err) && failureCount < 2,
  });

  const header = (
    <CollapsingPageHeader
      title="Kết quả tư vấn"
      subtitle={data?.title ?? "Outfit AI đã gợi ý cho bạn"}
      showAiBadge
      backHref={back.href}
      backLabel={back.label}
    />
  );

  if (!storesReady || isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (isNotFound(error)) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <EmptyState
          title="Không tìm thấy gợi ý outfit"
          description="Gợi ý này không còn tồn tại hoặc không thuộc tài khoản của bạn."
          actionLabel="Tư vấn outfit mới"
          actionHref="/ai/chat"
        />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <ErrorState
          message={getUserErrorMessage(error, "Không tải được gợi ý outfit. Vui lòng thử lại.")}
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      {header}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
        {data.preview?.imageUrl && (
          <div className="mx-auto w-full max-w-[300px] space-y-3 lg:mx-0">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-muted">
              <AppImage src={data.preview.imageUrl} alt={data.title} fill className="object-contain" />
            </div>
            {data.preview.disclaimer && (
              <p className="text-xs leading-relaxed text-muted-foreground">{data.preview.disclaimer}</p>
            )}
          </div>
        )}

        <div className={data.preview?.imageUrl ? "min-w-0" : "min-w-0 lg:col-span-2"}>
          <ChatOutfitCard recommendation={data} defaultExpanded />
        </div>
      </div>

      <Disclaimer className="mt-6" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" asChild>
          <Link href={`/ai/variants/${id}`}>
            <Layers className="mr-2 h-4 w-4" />
            Thử biến thể
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/similar-products?recommendation=${id}`}>
            <Shirt className="mr-2 h-4 w-4" />
            Sản phẩm tương tự
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
