"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { recommendationApi } from "@/services/recommendation-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Disclaimer } from "@/components/layout/Disclaimer";

export default function AiVariantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => recommendationApi.getById(id),
  });

  if (isLoading) return <div className="mx-auto max-w-xl px-4 py-8"><LoadingSkeleton /></div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Thử biến thể</h1>
      <p className="mt-2 text-stone-500">So sánh size, form và màu sắc khác nhau</p>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">So sánh size</CardTitle></CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1 rounded-lg border p-4 text-center">
              <p className="text-sm text-stone-500">Gợi ý</p>
              <p className="text-xl font-bold">{data?.recommendedSize || "M"}</p>
            </div>
            <div className="flex-1 rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-stone-500">Thay thế</p>
              <p className="text-xl font-bold">{data?.alternativeSize || "L"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gợi ý form</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{data?.recommendedForm || "Regular"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gợi ý màu sắc</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{data?.recommendedColor || "Navy"}</p>
          </CardContent>
        </Card>
      </div>

      <Disclaimer className="mt-6" />

      <Button className="mt-6 w-full" asChild>
        <Link href={`/ai/result/${id}`}>Quay lại kết quả</Link>
      </Button>
    </div>
  );
}
