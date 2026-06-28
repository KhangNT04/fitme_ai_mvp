"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageSuspense } from "@/components/common/PageSuspense";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function RedirectLoadingPage() {
  return (
    <PageSuspense>
      <RedirectLoadingContent />
    </PageSuspense>
  );
}

function RedirectLoadingContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  useEffect(() => {
    if (url) {
      const timer = setTimeout(() => {
        window.location.href = decodeURIComponent(url);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [url]);

  return (
    <PageShell width="narrow" className="flex flex-col items-center py-24 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/70" />
      <PageHeader
        title="Đang chuyển hướng..."
        subtitle="Bạn sẽ được chuyển đến trang bán hàng trong giây lát"
        sticky={false}
        className="mt-6 text-center [&_h1]:text-xl [&_h1]:font-semibold"
      />
    </PageShell>
  );
}
