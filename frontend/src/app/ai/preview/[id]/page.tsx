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
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";

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

  if (isLoading) {
    return (
      <PageShell width="medium">
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }
  if (error || !data) {
    return (
      <PageShell width="medium">
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="medium">
      <PageHeader
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title="Preview outfit 2D"
        subtitle="Ảnh minh họa bằng AI trên hình của bạn"
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá sản phẩm"
      />

      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        {data.imageUrl ? (
          <Image src={data.imageUrl} alt="Preview 2D" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/70">
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
    </PageShell>
  );
}
