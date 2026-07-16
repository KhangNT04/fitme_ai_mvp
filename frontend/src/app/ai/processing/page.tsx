"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { previewApi } from "@/services/upload-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { PageShell } from "@/components/layout/PageShell";
import { PageSuspense } from "@/components/common/PageSuspense";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function AiProcessingPage() {
  return (
    <PageSuspense>
      <AiProcessingContent />
    </PageSuspense>
  );
}

function AiProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";
  const photoId = searchParams.get("photo");
  const recommendationId = searchParams.get("recommendation");
  const { draft } = useConsultationStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPreviewMode) {
      router.replace("/ai/chat");
      return;
    }

    const generate = async () => {
      const recId = recommendationId || draft.recommendationId;
      if (!recId || !photoId) {
        router.replace("/ai/start");
        return;
      }
      if ((draft.previewOutfitItems?.length ?? 0) === 0) {
        router.replace(`/ai/preview-outfit?recommendation=${recId}`);
        return;
      }

      try {
        const result = await previewApi.create({
          recommendationId: recId,
          photoUploadId: photoId,
          previewType: "USER_PHOTO_2D",
        });
        router.replace(`/ai/preview/${result.id}`);
      } catch (e: unknown) {
        setError(
          getUserErrorMessage(e, {
            fallback: "Không thể tạo preview 2D. Vui lòng thử lại.",
          }),
        );
      }
    };

    void generate();
  }, [
    draft.previewOutfitItems,
    draft.recommendationId,
    isPreviewMode,
    photoId,
    recommendationId,
    router,
  ]);

  if (!isPreviewMode) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton className="h-48" />
      </PageShell>
    );
  }

  if (error) {
    const recId = recommendationId || draft.recommendationId;
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <FlowWizardToolbar
          steps={AI_FLOW_STEPS}
          currentStep={2}
          title="Preview outfit 2D"
          backHref={
            recId
              ? `/ai/photo-check?photo=${photoId}&recommendation=${recId}`
              : "/ai/chat"
          }
          backLabel="Kiểm tra ảnh"
          showAiBadge
        />
        <ErrorState
          title="Tạo preview thất bại"
          message={error}
          onRetry={() =>
            recId && photoId
              ? router.push(
                  `/ai/processing?preview=true&photo=${photoId}&recommendation=${recId}`,
                )
              : router.push("/ai/chat")
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={2}
        title="AI đang tạo preview 2D..."
        subtitle={`${draft.previewOutfitItems?.length ?? 0} món trong set của bạn`}
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá"
      />
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <Disclaimer className="mt-8" compact />
      </div>
    </PageShell>
  );
}
