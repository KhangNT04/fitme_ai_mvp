"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { recommendationApi } from "@/services/recommendation-api";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SavedOutfitsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["saved-outfits"],
    queryFn: () => recommendationApi.getSaved(),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Gợi ý đã lưu</h1>
      <p className="mt-2 text-stone-500">Các outfit bạn đã lưu từ tư vấn AI</p>

      <div className="mt-8">
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
                    <p className="text-sm text-stone-500">{item.outfitItems.length} items</p>
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
    </div>
  );
}
