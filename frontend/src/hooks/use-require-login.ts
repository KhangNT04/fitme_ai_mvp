"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConsumerStoresReady } from "@/hooks/use-consumer-stores-ready";
import { isJwtExpired } from "@/lib/jwt-expiry";

export function buildLoginHref(next: string): string {
  return `/auth/login?redirect=${encodeURIComponent(next)}`;
}

/** Non-reactive check (event handlers): valid access token or refreshable session. */
export function isUserLoggedIn(): boolean {
  const { accessToken, refreshToken } = useAuthStore.getState();
  return (!!accessToken && !isJwtExpired(accessToken)) || (!!refreshToken && !isJwtExpired(refreshToken));
}

/**
 * Auth guard for consumer commerce pages. Waits for persisted stores, then redirects
 * guests to `/auth/login?redirect=<current url>`. A valid refresh token counts as logged in
 * (the axios client refreshes the access token on the first 401).
 */
export function useRequireLogin(): { ready: boolean; authed: boolean } {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const ready = useConsumerStoresReady();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const authed = useMemo(
    () =>
      (!!accessToken && !isJwtExpired(accessToken)) || (!!refreshToken && !isJwtExpired(refreshToken)),
    [accessToken, refreshToken],
  );

  const query = searchParams?.toString();
  useEffect(() => {
    if (!ready || authed) return;
    router.replace(buildLoginHref(query ? `${pathname}?${query}` : pathname));
  }, [ready, authed, router, pathname, query]);

  return { ready, authed };
}
