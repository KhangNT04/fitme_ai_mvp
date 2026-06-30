"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { useTryOnStore } from "@/stores/tryon-store";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { PageShell } from "@/components/layout/PageShell";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function TryOnProcessingPage() {
  const router = useRouter();
  const { requestId, input } = useTryOnStore();

  useEffect(() => {
    const generate = async () => {
      if (!requestId || !input.heightCm) {
        router.replace("/try-on");
        return;
      }

      try {
        await tryonApi.generate(requestId);
        router.replace(`/try-on/result/${requestId}`);
      } catch {
        router.replace("/try-on");
      }
    };

    generate();
  }, [requestId, input, router]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={3}
        title="Đang tạo preview thử mặc..."
        subtitle="AI đang xử lý outfit và gợi ý size/form/màu"
        showAiBadge
        backHref="/try-on/input"
        backLabel="Thông tin thử mặc"
      />
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <Disclaimer className="mt-8" compact />
      </div>
    </PageShell>
  );
}
