"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { consumerPageShellClass, pageSubtitle, pageTitle } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/80 px-6 py-16 text-center sm:py-24 dark:border-red-900/50 dark:bg-red-950/20">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
        <h1 className={cn(pageTitle, "text-red-900 dark:text-red-200")}>Đã xảy ra lỗi</h1>
        <p className={cn(pageSubtitle, "max-w-md text-red-700 dark:text-red-300")}>
          Trang gặp sự cố khi hiển thị. Vui lòng thử lại hoặc quay về trang chủ.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-red-600/80 dark:text-red-400/80">Mã lỗi: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="rounded-full" onClick={() => unstable_retry()}>
            Thử lại
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
