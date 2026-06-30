"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { profileApi } from "@/services/profile-api";
import { useSavedProfiles } from "@/hooks/use-saved-profiles";
import { resolveBodyProfileInitial } from "@/lib/profile-prefill";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { BodyProfileEditor, formToBodyProfile } from "@/components/profile/BodyProfileEditor";
import { useConsultationStore } from "@/stores/consultation-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import type { BodyProfileForm } from "@/utils/validators";

function GuestPrompt() {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="surface-card mx-auto w-full max-w-md rounded-xl px-5 py-8 text-center sm:rounded-2xl sm:px-6 sm:py-10">
        <h1 className="font-display text-xl font-bold text-foreground">Chỉnh sửa hồ sơ cơ thể</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vui lòng đăng nhập để cập nhật thông tin.</p>
        <Button className="mt-5 min-h-11 w-full rounded-full sm:mt-6 sm:w-auto" asChild>
          <Link href="/auth/login?redirect=/profile/body">Đăng nhập</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export default function ProfileBodyEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const { bodyProfile: savedBodyProfile, isLoading } = useSavedProfiles({
    enabled: isAuthenticated(),
  });
  const initial = resolveBodyProfileInitial(draftBodyProfile, savedBodyProfile);

  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);

  const saveMutation = useMutation({
    mutationFn: profileApi.saveBodyProfile,
    onSuccess: (saved) => {
      setBodyProfile(saved);
      queryClient.invalidateQueries({ queryKey: ["body-profile"] });
      router.push("/profile");
    },
  });

  if (!isAuthenticated()) {
    return <GuestPrompt />;
  }

  const handleSubmit = async (data: BodyProfileForm) => {
    try {
      await saveMutation.mutateAsync(formToBodyProfile(data));
    } catch (err) {
      alert(getUserErrorMessage(err));
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Chỉnh sửa hồ sơ cơ thể"
        subtitle="Cập nhật số đo và gu mặc của bạn"
        backHref="/profile"
        backLabel="Hồ sơ của tôi"
        showMobileBack
      />

      {isLoading ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <BodyProfileEditor
          initial={initial}
          onSubmit={handleSubmit}
          saving={saveMutation.isPending}
          footer={
            <Button type="button" variant="outline" className="min-h-11 rounded-full" asChild>
              <Link href="/profile">Hủy</Link>
            </Button>
          }
        />
      )}
    </PageShell>
  );
}
