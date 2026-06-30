"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { uploadApi } from "@/services/upload-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PreviewOutfitTray } from "@/components/ai/PreviewOutfitTray";
import { useConsultationStore } from "@/stores/consultation-store";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageSuspense } from "@/components/common/PageSuspense";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

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
  const { draft } = useConsultationStore();
  const previewItems = draft.previewOutfitItems ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["photo-quality", photoId],
    queryFn: () => uploadApi.checkQuality(photoId!),
    enabled: !!photoId,
  });

  if (!photoId) {
    router.replace("/ai/photo-upload");
    return null;
  }

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton count={1} />
      </PageShell>
    );
  }

  const config = data ? qualityConfig[data.quality] : qualityConfig.INVALID;
  const Icon = config.icon;

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title="Kiểm tra ảnh"
        showAiBadge
        backHref={`/ai/photo-upload?recommendation=${recommendationId || ""}`}
        backLabel="Upload ảnh"
      />

      {previewItems.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Set preview ({previewItems.length} món)
            </p>
            <PreviewOutfitTray items={previewItems} compact />
            {recommendationId && (
              <Button
                variant="ghost"
                className="mt-2 h-auto p-0 text-xs"
                onClick={() => router.push(`/ai/preview-outfit?recommendation=${recommendationId}`)}
              >
                Chỉnh lại set outfit
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          <Icon className={`h-16 w-16 ${config.color}`} />
          <h2 className="mt-4 text-xl font-semibold">{config.label}</h2>
          <p className="mt-2 text-muted-foreground">{data?.message}</p>
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
            variant="ai"
            onClick={() => router.push(`/ai/processing?preview=true&photo=${photoId}&recommendation=${recommendationId}`)}
          >
            Tiếp tục tạo preview
          </Button>
        )}
      </div>
    </PageShell>
  );
}
