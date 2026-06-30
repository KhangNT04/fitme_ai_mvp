"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { recommendationApi } from "@/services/recommendation-api";
import type { ApiError } from "@/services/api-client";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import {
  hasApiRequestIdentity,
  useConsumerStoresReady,
} from "@/hooks/use-consumer-stores-ready";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function SavedOutfitsPage() {
  const storesReady = useConsumerStoresReady();
  const { ensureSession } = useEnsureSession();
  const [identityReady, setIdentityReady] = useState(false);

  useEffect(() => {
    if (!storesReady) return;

    let cancelled = false;

    (async () => {
      if (!hasApiRequestIdentity()) {
        await ensureSession();
      }
      if (!cancelled) {
        setIdentityReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storesReady, ensureSession]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["saved-outfits"],
    queryFn: () => recommendationApi.getSaved(),
    enabled: identityReady,
  });

  const showLoading = !identityReady || isLoading || (isFetching && data === undefined);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Gợi ý đã lưu"
        subtitle="Các outfit bạn đã lưu từ tư vấn AI"
        backHref="/"
        backLabel="Trang chủ"
      />

      <div>
        {showLoading && <LoadingSkeleton type="list" />}
        {!showLoading && error && (
          <ErrorState
            message={(error as ApiError).message}
            onRetry={() => refetch()}
          />
        )}
        {!showLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="Chưa có gợi ý nào"
            description="Lưu outfit từ kết quả tư vấn AI để xem lại sau."
            actionLabel="Bắt đầu tư vấn"
            actionHref="/ai/start"
          />
        )}
        {!showLoading && !error && data && data.length > 0 && (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.outfitItems.length} món trong set
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/ai/result/${item.id}`}>Xem</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
