"use client";

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout, so it cannot rely on Providers, fonts or consumer chrome.
export default function GlobalError({
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
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <title>Đã xảy ra lỗi — FitMe AI</title>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Đã xảy ra lỗi</h1>
        <p className="mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
          FitMe AI đang gặp sự cố. Vui lòng thử lại sau ít phút.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Mã lỗi: {error.digest}</p>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="min-h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            Thử lại
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is intended after a root layout crash */}
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium"
          >
            Về trang chủ
          </a>
        </div>
      </body>
    </html>
  );
}
