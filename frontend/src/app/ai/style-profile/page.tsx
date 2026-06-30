"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { StyleProfileEditor, formToStyleProfile } from "@/components/profile/StyleProfileEditor";
import { useConsultationStore } from "@/stores/consultation-store";
import { useHydrateConsultationProfiles } from "@/hooks/use-hydrate-consultation-profiles";
import { resolveStyleProfileInitial } from "@/lib/profile-prefill";
import { consumerPageShellClass } from "@/lib/design-tokens";
import type { StyleProfileForm } from "@/utils/validators";

export default function StyleProfilePage() {
  const router = useRouter();
  const draftStyleProfile = useConsultationStore((s) => s.draft.styleProfile);
  const setStyleProfile = useConsultationStore((s) => s.setStyleProfile);
  const { styleProfile: savedStyleProfile, isLoading } = useHydrateConsultationProfiles();
  const initial = resolveStyleProfileInitial(draftStyleProfile, savedStyleProfile);

  const onSubmit = (data: StyleProfileForm) => {
    setStyleProfile(formToStyleProfile(data));
    router.push("/ai/occasion");
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={2}
        title="Gu thời trang"
        subtitle="Chọn phong cách và màu sắc bạn yêu thích"
        showAiBadge
        backHref="/ai/body-profile"
        backLabel="Thông tin cơ thể"
      />

      {isLoading ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <StyleProfileEditor
          initial={initial}
          onSubmit={onSubmit}
          submitLabel="Tiếp tục"
          footer={
            <Button type="button" variant="outline" className="min-h-11 rounded-full" asChild>
              <Link href="/ai/body-profile">Quay lại</Link>
            </Button>
          }
        />
      )}
    </PageShell>
  );
}
