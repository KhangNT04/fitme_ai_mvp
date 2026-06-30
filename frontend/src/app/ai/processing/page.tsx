"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { previewApi } from "@/services/upload-api";
import { profileApi } from "@/services/profile-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { resolveConsultationStyleProfile } from "@/hooks/use-hydrate-consultation-profiles";
import { hasMinimalBodyProfile } from "@/lib/profile-prefill";
import { mergeBodyProfiles } from "@/lib/profile-merge";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
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
  const queryClient = useQueryClient();
  const isPreviewMode = searchParams.get("preview") === "true";
  const photoId = searchParams.get("photo");
  const recommendationId = searchParams.get("recommendation");
  const { draft, setRecommendationId } = useConsultationStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generate = async () => {
      if (isPreviewMode) {
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
        return;
      }

      if (!draft.sessionId || !draft.occasionRequest) {
        router.replace("/ai/start");
        return;
      }

      const bodyProfile = mergeBodyProfiles(
        await profileApi.getBodyProfile(),
        draft.bodyProfile,
      );
      const styleProfile = resolveConsultationStyleProfile(
        draft.styleProfile,
        await profileApi.getStyleProfile(),
      );

      if (!hasMinimalBodyProfile(bodyProfile)) {
        router.replace("/ai/body-profile");
        return;
      }

      try {
        await profileApi.saveBodyProfile(bodyProfile);
        await profileApi.saveStyleProfile(styleProfile);
        await queryClient.invalidateQueries({ queryKey: ["body-profile"] });
        await queryClient.invalidateQueries({ queryKey: ["style-profile"] });

        const result = await recommendationApi.create({
          sessionId: draft.sessionId,
          selectedProductId: draft.selectedProductId || null,
          ...(draft.occasionRequest.occasion ? { occasion: draft.occasionRequest.occasion } : {}),
          ...(draft.occasionRequest.desiredVibe ? { desiredVibe: draft.occasionRequest.desiredVibe } : {}),
          wardrobeMode: draft.wardrobeMode,
          budgetMin: draft.occasionRequest.budgetMin,
          budgetMax: draft.occasionRequest.budgetMax,
        });
        setRecommendationId(result.id);
        router.replace(`/ai/result/${result.id}`);
      } catch (e: unknown) {
        setError(getUserErrorMessage(e, { fallback: "Không thể tạo gợi ý outfit. Vui lòng thử lại." }));
      }
    };

    generate();
  }, [
    draft,
    isPreviewMode,
    photoId,
    recommendationId,
    queryClient,
    router,
    setRecommendationId,
  ]);

  if (error) {
    const recId = recommendationId || draft.recommendationId;
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <FlowWizardToolbar
          steps={AI_FLOW_STEPS}
          currentStep={4}
          title={isPreviewMode ? "Preview outfit 2D" : "Tư vấn outfit"}
          backHref={isPreviewMode && recId ? `/ai/photo-check?photo=${photoId}&recommendation=${recId}` : "/ai/occasion"}
          backLabel={isPreviewMode ? "Kiểm tra ảnh" : "Hoàn cảnh & vibe"}
          showAiBadge
        />
        <ErrorState
          title={isPreviewMode ? "Tạo preview thất bại" : "Tạo gợi ý thất bại"}
          message={error}
          onRetry={() =>
            isPreviewMode && recId && photoId
              ? router.push(`/ai/processing?preview=true&photo=${photoId}&recommendation=${recId}`)
              : router.push("/ai/occasion")
          }
        />
        {!isPreviewMode && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/ai/start")}>
            Bắt đầu lại
          </Button>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title={isPreviewMode ? "AI đang tạo preview 2D..." : "AI đang tạo gợi ý outfit..."}
        subtitle={
          isPreviewMode
            ? `${draft.previewOutfitItems?.length ?? 0} món trong set của bạn`
            : "Phân tích dáng người, gu và hoàn cảnh của bạn"
        }
        showAiBadge
        backHref={isPreviewMode ? "/discover" : "/ai/occasion"}
        backLabel={isPreviewMode ? "Khám phá" : "Hoàn cảnh & vibe"}
      />
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <Disclaimer className="mt-8" compact />
      </div>
    </PageShell>
  );
}
