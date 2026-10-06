"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { safeInternalPathOr } from "@/lib/safe-redirect";

export function useAuthRedirect(defaultPath = "/profile") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeInternalPathOr(searchParams.get("redirect"), defaultPath);

  const goAfterAuth = useCallback(async () => {
    router.push(redirect);
    router.refresh();
  }, [router, redirect]);

  return { redirect, goAfterAuth };
}
