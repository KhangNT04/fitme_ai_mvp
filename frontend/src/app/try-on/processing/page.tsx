"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tryonApi } from "@/services/tryon-api";
import { useTryOnStore } from "@/stores/tryon-store";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { PageShell } from "@/components/layout/PageShell";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { ErrorState } from "@/components/common/ErrorState";
import { BackLink } from "@/components/layout/BackLink";
import { toast } from "@/stores/toast-store";
import { useTryOnPoll } from "@/hooks/use-tryon-poll";
import { TryOnProgressBar } from "@/components/tryon/TryOnProgressBar";
import type { TryOnInputMode } from "@/types/tryon";

const MODE_SUBTITLES: Record<TryOnInputMode, string> = {
  OUTFIT_BOARD_ONLY: "Đang tạo bảng phối đồ minh họa...",
  AVATAR: "Đang tạo preview trên avatar mẫu...",
  USER_PHOTO: "Đang tạo preview trên ảnh của bạn...",
};

export default function TryOnProcessingPage() {
  const router = useRouter();
  const requestId = useTryOnStore((s) => s.requestId);
  const inputMode = useTryOnStore((s) => (s.input.inputMode ?? "OUTFIT_BOARD_ONLY") as TryOnInputMode);
  const navigatedRef = useRef(false);

  const { phase, error, elapsedMs, retry } = useTryOnPoll({
    requestId,
    onCompleted: () => {
      if (navigatedRef.current || !requestId) return;
      navigatedRef.current = true;
      router.replace(`/try-on/result/${requestId}`);
    },
  });

  useEffect(() => {
    if (!requestId) {
      router.replace("/try-on");
    }
  }, [requestId, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const subtitle = MODE_SUBTITLES[inputMode] ?? MODE_SUBTITLES.OUTFIT_BOARD_ONLY;

  if (error) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <FlowWizardToolbar
          steps={TRYON_FLOW_STEPS}
          currentStep={3}
          title="Không tạo được preview"
          subtitle={subtitle}
          showAiBadge
          backHref="/try-on/input"
          backLabel="Thông tin thử mặc"
        />
        <ErrorState
          title="Tạo preview thất bại"
          message={error}
          onRetry={() => {
            navigatedRef.current = false;
            retry();
          }}
        />
        <div className="mt-4 flex justify-center">
          <BackLink href="/try-on/input" label="Quay lại nhập thông tin" solid />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={3}
        title="Đang tạo preview thử mặc..."
        subtitle={subtitle}
        showAiBadge
        backHref="/try-on/input"
        backLabel="Thông tin thử mặc"
      />
      <div className="flex flex-col items-center py-16 text-center">
        <TryOnProgressBar phase={phase} elapsedMs={elapsedMs} inputMode={inputMode} />
        <Disclaimer className="mt-8" compact />
      </div>
    </PageShell>
  );
}
