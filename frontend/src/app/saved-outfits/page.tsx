"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { recommendationApi } from "@/services/recommendation-api";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function SavedOutfitsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["saved-outfits"],
    queryFn: () => recommendationApi.getSaved(),
  });

  return (
    <PageShell width="wide">
      <PageHeader title="Gợi ý đã lưu" subtitle="Các outfit bạn đã lưu từ tư vấn AI" backHref="/" backLabel="Trang chủ" />

      <div>
        {isLoading && <LoadingSkeleton type="list" />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState
            title="Chưa có gợi ý nào"
            description="Lưu outfit từ kết quả tư vấn AI để xem lại sau."
            actionLabel="Bắt đầu tư vấn"
            actionHref="/ai/start"
          />
        )}
        {data && data.length > 0 && (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.outfitItems.length} items</p>
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
