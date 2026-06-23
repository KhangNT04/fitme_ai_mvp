"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { profileApi } from "@/services/profile-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";

export default function AiProcessingPage() {
  const router = useRouter();
  const { draft, setRecommendationId } = useConsultationStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generate = async () => {
      if (!draft.sessionId || !draft.bodyProfile || !draft.styleProfile || !draft.occasionRequest) {
        router.replace("/ai/start");
        return;
      }

      try {
        await profileApi.saveBodyProfile(draft.bodyProfile);
        await profileApi.saveStyleProfile(draft.styleProfile);

        const result = await recommendationApi.create({
          sessionId: draft.sessionId,
          selectedProductId: draft.selectedProductId || null,
          occasion: draft.occasionRequest.occasion,
          desiredVibe: draft.occasionRequest.desiredVibe,
          wardrobeMode: draft.wardrobeMode,
          budgetMin: draft.occasionRequest.budgetMin,
          budgetMax: draft.occasionRequest.budgetMax,
        });
        setRecommendationId(result.id);
        router.replace(`/ai/result/${result.id}`);
      } catch (e: unknown) {
        const message =
          (e as { message?: string })?.message ||
          "Không thể tạo gợi ý outfit. Vui lòng thử lại.";
        setError(message);
      }
    };

    generate();
  }, [draft, router, setRecommendationId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <ErrorState
          title="Tạo gợi ý thất bại"
          message={error}
          onRetry={() => router.push("/ai/occasion")}
        />
        <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/ai/start")}>
          Bắt đầu lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
      <Loader2 className="h-12 w-12 animate-spin text-stone-400" />
      <h1 className="mt-6 text-xl font-semibold text-stone-900">AI đang tạo gợi ý outfit...</h1>
      <p className="mt-2 text-stone-500">Phân tích dáng người, gu và hoàn cảnh của bạn</p>
      <Disclaimer className="mt-8" compact />
    </div>
  );
}
