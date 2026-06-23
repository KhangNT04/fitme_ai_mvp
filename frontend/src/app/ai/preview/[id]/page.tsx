"use client";

import { use } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { previewApi } from "@/services/upload-api";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function AiPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["preview", id],
    queryFn: () => previewApi.getById(id),
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-8"><LoadingSkeleton type="detail" /></div>;
  if (error || !data) return <div className="mx-auto max-w-2xl px-4 py-8"><ErrorState onRetry={() => refetch()} /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Preview outfit 2D</h1>
      <p className="mt-2 text-stone-500">Ảnh minh họa bằng AI trên hình của bạn</p>

      <div className="mt-6 relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
        {data.imageUrl ? (
          <Image src={data.imageUrl} alt="Preview 2D" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">
            {data.status === "PROCESSING" ? "Đang tạo preview..." : "Không có ảnh preview"}
          </div>
        )}
      </div>

      <Disclaimer className="mt-6" />

      <Button
        variant="outline"
        className="mt-6"
        onClick={() => previewApi.delete(id)}
      >
        <Trash2 className="mr-2 h-4 w-4" />Xóa ảnh của tôi
      </Button>
    </div>
  );
}
