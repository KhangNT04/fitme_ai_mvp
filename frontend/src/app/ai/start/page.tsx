"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useBodyProfileReady } from "@/hooks/use-body-profile-ready";
import { consumerPageShellClass } from "@/lib/design-tokens";

/** Gate: redirect to chat if body profile exists, otherwise require body profile. */
export default function AiStartPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const { ready, isLoading } = useBodyProfileReady();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (isLoading) return;
    if (ready) {
      router.replace("/ai/chat");
    } else {
      router.replace("/ai/body-profile?required=1");
    }
  }, [isLoading, ready, router]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <LoadingSkeleton className="h-48" />
      <p className="mt-4 text-center text-sm text-muted-foreground">Đang kiểm tra hồ sơ…</p>
    </PageShell>
  );
}
