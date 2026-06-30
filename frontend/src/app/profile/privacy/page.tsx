"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Trash2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { privacyApi } from "@/services/privacy-api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";

type DeletionRequestType = "RECOMMENDATION_HISTORY" | "PHOTO_UPLOAD" | "ALL";

const REQUEST_OPTIONS: {
  value: DeletionRequestType;
  label: string;
  description: string;
}[] = [
  {
    value: "RECOMMENDATION_HISTORY",
    label: "Dữ liệu session / tư vấn",
    description: "Lịch sử tư vấn AI, gợi ý outfit và session ẩn danh liên quan.",
  },
  {
    value: "PHOTO_UPLOAD",
    label: "Chỉ ảnh đã upload",
    description: "Ảnh thử mặc hoặc preview đã tải lên, không xóa tài khoản.",
  },
  {
    value: "ALL",
    label: "Toàn bộ tài khoản",
    description: "Xóa toàn bộ dữ liệu cá nhân và đăng xuất sau khi admin xử lý.",
  },
];

function GuestPrivacyPrompt() {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="surface-card mx-auto w-full max-w-md rounded-xl px-5 py-8 text-center sm:rounded-2xl sm:px-6 sm:py-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 sm:h-14 sm:w-14 sm:rounded-2xl">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">Quyền riêng tư</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vui lòng đăng nhập để quản lý dữ liệu cá nhân.</p>
        <Button className="mt-5 min-h-11 w-full rounded-full sm:mt-6 sm:w-auto" asChild>
          <Link href="/auth/login?redirect=/profile/privacy">Đăng nhập</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export default function ProfilePrivacyPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [requestType, setRequestType] = useState<DeletionRequestType>("RECOMMENDATION_HISTORY");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated()) {
    return <GuestPrivacyPrompt />;
  }

  const selectedOption = REQUEST_OPTIONS.find((o) => o.value === requestType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      await privacyApi.requestDeletion({ requestType });
      setMessage("Yêu cầu xóa dữ liệu đã được ghi nhận. Admin sẽ xử lý trong thời gian sớm nhất.");
      if (requestType === "ALL") {
        setTimeout(async () => {
          await logout();
          router.push("/");
        }, 2000);
      }
    } catch (e: unknown) {
      setIsError(true);
      setMessage(getUserErrorMessage(e, "Gửi yêu cầu thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Quyền riêng tư & dữ liệu"
        subtitle="Quản lý consent và yêu cầu xóa dữ liệu cá nhân"
        backHref="/profile"
        backLabel="Hồ sơ của tôi"
      />

      <div className="space-y-3 sm:space-y-4">
        <section className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 sm:h-10 sm:w-10 sm:rounded-xl">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">
                Quyền riêng tư của bạn
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                FitMe AI lưu dữ liệu tư vấn, ảnh upload và profile để cải thiện gợi ý. Bạn có thể
                gửi yêu cầu xóa bất cứ lúc nào — admin sẽ xử lý theo quy trình nội bộ.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive sm:h-8 sm:w-8">
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">
              Yêu cầu xóa dữ liệu
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-3 py-3 sm:px-5 sm:py-4">
            <div>
              <Label htmlFor="requestType" className="text-xs sm:text-sm">
                Loại yêu cầu
              </Label>
              <select
                id="requestType"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as DeletionRequestType)}
                className="mt-1.5 flex h-11 w-full rounded-xl border border-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10"
              >
                {REQUEST_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedOption && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {selectedOption.description}
                </p>
              )}
            </div>

            {requestType === "ALL" && (
              <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900 sm:text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  Yêu cầu xóa toàn bộ tài khoản sẽ đăng xuất bạn sau khi gửi. Admin cần xác nhận
                  trước khi xóa vĩnh viễn.
                </p>
              </div>
            )}

            {message && (
              <p
                className={cn(
                  "rounded-xl px-3 py-2.5 text-xs sm:text-sm",
                  isError
                    ? "border border-destructive/30 bg-destructive/5 text-destructive"
                    : "border border-emerald-200/80 bg-emerald-50/80 text-emerald-900",
                )}
                role="status"
              >
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-full sm:w-auto"
              variant={requestType === "ALL" ? "destructive" : "default"}
            >
              {loading ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>
          </form>
        </section>
      </div>
    </PageShell>
  );
}
