"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { consumerPageShellClass } from "@/lib/design-tokens";

/** Legacy style-options step — redirect to stylist chat. */
export default function AiOptionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ai/chat");
  }, [router]);
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <LoadingSkeleton className="h-48" />
    </PageShell>
  );
}
