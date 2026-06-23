"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { uploadApi } from "@/services/upload-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageSuspense } from "@/components/common/PageSuspense";

const qualityConfig = {
  GOOD: { icon: CheckCircle, color: "text-emerald-600", label: "Ảnh tốt" },
  ACCEPTABLE: { icon: AlertTriangle, color: "text-amber-600", label: "Ảnh chấp nhận được" },
  POOR: { icon: AlertTriangle, color: "text-amber-600", label: "Ảnh chưa rõ" },
  INVALID: { icon: XCircle, color: "text-red-600", label: "Ảnh không hợp lệ" },
};

export default function PhotoCheckPage() {
  return (
    <PageSuspense>
      <PhotoCheckContent />
    </PageSuspense>
  );
}

function PhotoCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photo");
  const recommendationId = searchParams.get("recommendation");

  const { data, isLoading } = useQuery({
    queryKey: ["photo-quality", photoId],
    queryFn: () => uploadApi.checkQuality(photoId!),
    enabled: !!photoId,
  });

  if (!photoId) {
    router.replace("/ai/photo-upload");
    return null;
  }

  if (isLoading) return <div className="mx-auto max-w-xl px-4 py-8"><LoadingSkeleton count={1} /></div>;

  const config = data ? qualityConfig[data.quality] : qualityConfig.INVALID;
  const Icon = config.icon;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Kiểm tra ảnh</h1>

      <Card className="mt-8">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <Icon className={`h-16 w-16 ${config.color}`} />
          <h2 className="mt-4 text-xl font-semibold">{config.label}</h2>
          <p className="mt-2 text-stone-500">{data?.message}</p>
        </CardContent>
      </Card>

      <Disclaimer className="mt-6" />

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={() => router.push("/ai/photo-upload")}>
          Tải ảnh khác
        </Button>
        {data?.canProceed && (
          <Button
            className="flex-1"
            onClick={() => router.push(`/ai/processing?preview=true&photo=${photoId}&recommendation=${recommendationId}`)}
          >
            Tiếp tục tạo preview
          </Button>
        )}
      </div>
    </div>
  );
}
