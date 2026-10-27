"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/services/auth-api";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/auth-events";
import { isJwtExpired } from "@/lib/jwt-expiry";
import { AUTH_REFRESH_KEY } from "@/utils/constants";

/** Where a viewer belongs when their session ran out, per portal. */
function signInPathFor(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/brand")) return "/brand/login";
  return "/auth/login";
}

/**
 * Ends the session the moment it can no longer be renewed: the viewer is signed out and sent to
 * the sign-in page instead of staring at a page that only reports "not found".
 *
 * The guard watches for two things:
 *  - the API client reporting that the refresh token was rejected (401 on refresh),
 *  - the stored refresh token quietly expiring while the tab sits idle.
 */
export function useSessionExpiryGuard(): void {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  // Survives effect re-runs, so one expiry never triggers two sign-outs.
  const signingOut = useRef(false);

  useEffect(() => {
    const signOut = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      // Revoke before clearing: clearing drops the token from storage, which the revoke call needs.
      const refreshToken =
        typeof window !== "undefined" ? localStorage.getItem(AUTH_REFRESH_KEY) : null;
      if (refreshToken) {
        void authApi.revokeRefreshToken(refreshToken).catch(() => undefined);
      }
      // The portal cookies gate the admin/brand routes: they must be gone before the redirect,
      // otherwise the middleware would bounce the viewer straight back to the dashboard.
      await useAuthStore.getState().clearAuth();

      const target = signInPathFor(pathname);
      // Keep the intended destination so the viewer lands back where they were.
      const redirect = pathname && pathname !== target ? `?redirect=${encodeURIComponent(pathname)}` : "";
      // `expired` lets the sign-in page explain why the viewer was sent here.
      router.replace(`${target}${redirect}${redirect ? "&" : "?"}expired=1`);
    };

    const onExpired = () => {
      void signOut();
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);

    // A tab left open past the refresh token's lifetime must not keep showing a stale portal.
    const timer = window.setInterval(() => {
      const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
      if (!refreshToken) return;
      if (isJwtExpired(refreshToken)) {
        onExpired();
      }
    }, 30_000);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
      window.clearInterval(timer);
    };
  }, [pathname, router]);
}
