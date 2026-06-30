"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { BodyProfileEditor, formToBodyProfile } from "@/components/profile/BodyProfileEditor";
import { useConsultationStore } from "@/stores/consultation-store";
import { useHydrateConsultationProfiles } from "@/hooks/use-hydrate-consultation-profiles";
import { mergeBodyProfiles } from "@/lib/profile-merge";
import { resolveBodyProfileInitial } from "@/lib/profile-prefill";
import { consumerPageShellClass } from "@/lib/design-tokens";
import type { BodyProfileForm } from "@/utils/validators";

export default function BodyProfilePage() {
  const router = useRouter();
  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);
  const { bodyProfile: savedBodyProfile, isLoading } = useHydrateConsultationProfiles();
  const initial = resolveBodyProfileInitial(draftBodyProfile, savedBodyProfile);

  const onSubmit = (data: BodyProfileForm) => {
    const next = mergeBodyProfiles(savedBodyProfile, formToBodyProfile(data)) ?? formToBodyProfile(data);
    setBodyProfile(next);
    router.push("/ai/style-profile");
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={1}
        title="Thông tin cơ thể"
        subtitle="Giúp AI gợi ý size và form phù hợp với bạn"
        showAiBadge
        backHref="/ai/start"
        backLabel="Bắt đầu tư vấn"
      />

      {isLoading ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <BodyProfileEditor
          initial={initial}
          onSubmit={onSubmit}
          submitLabel="Tiếp tục"
          footer={
            <Button type="button" variant="outline" className="min-h-11 rounded-full" asChild>
              <Link href="/ai/start">Quay lại</Link>
            </Button>
          }
        />
      )}
    </PageShell>
  );
}
