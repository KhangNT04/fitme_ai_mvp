"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageSuspense } from "@/components/common/PageSuspense";

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
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-stone-400" />
      <h1 className="mt-6 text-xl font-semibold text-stone-900">Đang chuyển hướng...</h1>
      <p className="mt-2 text-stone-500">Bạn sẽ được chuyển đến trang bán hàng trong giây lát</p>
    </div>
  );
}
