"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageSuspense } from "@/components/common/PageSuspense";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { redirectApi } from "@/services/redirect-api";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";

export default function RedirectLoadingPage() {
  return (
    <PageSuspense>
      <RedirectLoadingContent />
    </PageSuspense>
  );
}

function isSafeExternalHttpUrl(raw: string): boolean {
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = new URL(decoded);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function RedirectLoadingContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const eventId = searchParams.get("event");
  const [confirming, setConfirming] = useState(false);
  const [marked, setMarked] = useState(false);
  const safeUrl = url && isSafeExternalHttpUrl(url) ? url : null;

  useEffect(() => {
    if (safeUrl) {
      const timer = setTimeout(() => {
        window.location.href = decodeURIComponent(safeUrl);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [safeUrl]);

  const onPurchased = async () => {
    if (!eventId || marked) return;
    setConfirming(true);
    try {
      await redirectApi.confirmPurchased(eventId, true);
      setMarked(true);
      toast.success("Đã ghi nhận đã mua — xem lại trong Tủ chi tiêu");
    } catch {
      toast.error("Chưa ghi nhận được. Bạn có thể đánh dấu sau trong Hồ sơ → Tủ chi tiêu.");
    } finally {
      setConfirming(false);
    }
  };

  if (url && !safeUrl) {
    return (
      <PageShell width="full" className={cn(consumerPageShellClass, "flex flex-col items-center py-16 text-center sm:py-24")}>
        <PageHeader
          title="Liên kết không hợp lệ"
          subtitle="URL chuyển hướng phải bắt đầu bằng http:// hoặc https://"
          sticky={false}
          className="mt-6 text-center [&_h1]:text-xl [&_h1]:font-semibold"
        />
        <Button asChild className="mt-6 rounded-full">
          <Link href="/discover">Về khám phá</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={cn(consumerPageShellClass, "flex flex-col items-center py-16 text-center sm:py-24")}>
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/70" />
      <PageHeader
        title="Đang chuyển hướng..."
        subtitle="Bạn sẽ được chuyển đến trang bán hàng trong giây lát"
        sticky={false}
        className="mt-6 text-center [&_h1]:text-xl [&_h1]:font-semibold"
      />
      {eventId && (
        <div className="mt-6 max-w-sm space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="text-muted-foreground">
            Quay lại FitMe sau khi xem shop? Đánh dấu <span className="font-medium text-foreground">đã mua thật</span> để theo dõi chi tiêu.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              size="sm"
              className="rounded-full"
              disabled={confirming || marked}
              onClick={() => void onPurchased()}
            >
              {marked ? "Đã ghi nhận" : "Đã mua?"}
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link href="/profile/purchases">Tủ chi tiêu</Link>
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
