"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useAuthRedirect(defaultPath = "/profile") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || defaultPath;

  const goAfterAuth = useCallback(() => {
    router.push(redirect);
  }, [router, redirect]);

  return { redirect, goAfterAuth };
}
