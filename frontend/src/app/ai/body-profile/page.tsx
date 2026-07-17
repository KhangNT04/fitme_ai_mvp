"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { BackLink } from "@/components/layout/BackLink";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { BodyProfileEditor, formToBodyProfile } from "@/components/profile/BodyProfileEditor";
import { useConsultationStore } from "@/stores/consultation-store";
import { useAuthStore } from "@/stores/auth-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { useHydrateConsultationProfiles } from "@/hooks/use-hydrate-consultation-profiles";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { mergeBodyProfiles } from "@/lib/profile-merge";
import { resolveBodyProfileInitial } from "@/lib/profile-prefill";
import {
  getGuestBodyProfile,
  saveGuestBodyProfile,
} from "@/lib/local-profile-storage";
import { ensureServerBodyProfile } from "@/lib/ensure-server-body-profile";
import type { ApiError } from "@/services/api-client";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import type { BodyProfileForm } from "@/utils/validators";
import { STYLIST_STARTER_PENDING_KEY } from "@/types/stylist-chat";

function BodyProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1";
  const { ensureSession } = useEnsureSession();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);
  const clearChat = useStylistChatStore((s) => s.clearChat);
  const { bodyProfile: savedBodyProfile, isLoading } = useHydrateConsultationProfiles();
  const guestProfile = !isAuthenticated ? getGuestBodyProfile() : null;
  const initial = resolveBodyProfileInitial(
    draftBodyProfile ?? guestProfile ?? undefined,
    savedBodyProfile,
  );
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: BodyProfileForm) => {
    const next =
      mergeBodyProfiles(savedBodyProfile ?? guestProfile, formToBodyProfile(data)) ??
      formToBodyProfile(data);
    setSaving(true);
    try {
      await ensureSession();
      setBodyProfile(next);

      if (useAuthStore.getState().isAuthenticated()) {
        try {
          await ensureServerBodyProfile(next);
        } catch (e) {
          const status = (e as ApiError)?.status;
          if (status === 401 || status === 403) {
            useAuthStore.getState().clearAuth();
            saveGuestBodyProfile(next);
            await ensureServerBodyProfile(next);
          } else {
            throw e;
          }
        }
      } else {
        saveGuestBodyProfile(next);
        await ensureServerBodyProfile(next);
      }

      clearChat();
      sessionStorage.setItem(STYLIST_STARTER_PENDING_KEY, "1");
      router.push("/ai/chat");
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không lưu được hồ sơ. Vui lòng thử lại."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={1}
        title="Hồ sơ cơ thể"
        subtitle="Chiều cao, cân nặng, tuổi và form — cần có trước khi chat với stylist AI"
        showAiBadge
        backHref="/"
        backLabel="Trang chủ"
      />

      {required && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground sm:mb-6">
          Cần nhập hồ sơ cơ thể trước khi tư vấn — dữ liệu giúp AI gợi ý size và phối đồ chính xác hơn.
          {!isAuthenticated && (
            <span className="mt-1 block text-muted-foreground">
              Bạn chưa đăng nhập: hồ sơ sẽ lưu trên máy trong 30 ngày.
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <BodyProfileEditor
          initial={initial}
          onSubmit={onSubmit}
          submitLabel="Lưu và bắt đầu tư vấn"
          saving={saving}
          footer={
            <BackLink
              href="/"
              label="Quay lại"
              solid
              className="min-h-11 justify-center rounded-full px-5 sm:px-6"
            />
          }
        />
      )}
    </PageShell>
  );
}

export default function BodyProfilePage() {
  return (
    <Suspense
      fallback={
        <PageShell width="full" className={consumerPageShellClass}>
          <LoadingSkeleton className="h-96" />
        </PageShell>
      }
    >
      <BodyProfilePageContent />
    </Suspense>
  );
}
