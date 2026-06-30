"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { profileApi } from "@/services/profile-api";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { StyleProfileEditor, formToStyleProfile } from "@/components/profile/StyleProfileEditor";
import { useConsultationStore } from "@/stores/consultation-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import type { StyleProfileForm } from "@/utils/validators";

function GuestPrompt() {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="surface-card mx-auto w-full max-w-md rounded-xl px-5 py-8 text-center sm:rounded-2xl sm:px-6 sm:py-10">
        <h1 className="font-display text-xl font-bold text-foreground">Chỉnh sửa gu thời trang</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vui lòng đăng nhập để cập nhật thông tin.</p>
        <Button className="mt-5 min-h-11 w-full rounded-full sm:mt-6 sm:w-auto" asChild>
          <Link href="/auth/login?redirect=/profile/style">Đăng nhập</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export default function ProfileStyleEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data: styleProfile, isLoading } = useQuery({
    queryKey: ["style-profile"],
    queryFn: profileApi.getStyleProfile,
    enabled: isAuthenticated(),
  });

  const setStyleProfile = useConsultationStore((s) => s.setStyleProfile);

  const saveMutation = useMutation({
    mutationFn: profileApi.saveStyleProfile,
    onSuccess: (saved) => {
      setStyleProfile(saved);
      queryClient.invalidateQueries({ queryKey: ["style-profile"] });
      router.push("/profile");
    },
  });

  if (!isAuthenticated()) {
    return <GuestPrompt />;
  }

  const handleSubmit = async (data: StyleProfileForm) => {
    try {
      await saveMutation.mutateAsync(formToStyleProfile(data));
    } catch (err) {
      alert(getUserErrorMessage(err));
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Chỉnh sửa gu thời trang"
        subtitle="Cập nhật phong cách và màu sắc ưa thích"
        backHref="/profile"
        backLabel="Hồ sơ của tôi"
        showMobileBack
      />

      {isLoading ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <StyleProfileEditor
          initial={styleProfile}
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
