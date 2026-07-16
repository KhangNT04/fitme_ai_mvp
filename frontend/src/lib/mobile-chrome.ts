import { isPortalRoute as isPortalPath, isPortalAppRoute } from "@/lib/portal-nav";

const AUTH_PREFIX = "/auth";
const REDIRECT_PREFIX = "/redirect";

const BOTTOM_NAV_HIDDEN_AI = [
  "/ai/body-profile",
  "/ai/chat",
  "/ai/processing",
  "/ai/options",
  "/ai/photo-check",
  "/ai/photo-upload",
  "/ai/preview-outfit",
  "/ai/preview",
  "/ai/result",
  "/ai/variants",
];

const BOTTOM_NAV_HIDDEN_TRYON = [
  "/try-on/selected",
  "/try-on/input",
  "/try-on/processing",
  "/try-on/result",
  "/try-on/size",
  "/try-on/form",
  "/try-on/color",
  "/try-on/decision",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isPortalRoute(pathname: string): boolean {
  return isPortalPath(pathname);
}

const NAV_LEVEL_2_ROUTES = new Set([
  "/",
  "/discover",
  "/try-on",
  "/profile",
  "/ai/start",
  "/ai/chat",
  "/wardrobe",
  "/saved-outfits",
  "/similar-products",
  "/auth/login",
  "/auth/register",
  "/brand/login",
  "/brand/onboarding",
  "/brand/dashboard",
  "/brand/products",
  "/brand/analytics",
  "/brand/settings",
  "/admin/login",
  "/admin/dashboard",
  "/admin/brands",
  "/admin/products/moderation",
  "/admin/flagged-links",
  "/admin/analytics",
  "/admin/privacy",
  "/admin/try-on-monitoring",
]);

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  return pathname.split("?")[0].replace(/\/$/, "") || "/";
}

/** Hub routes (≤ level 2) — back link may scroll with the page title. */
export function isNavLevel2Route(pathname: string): boolean {
  return NAV_LEVEL_2_ROUTES.has(normalizePath(pathname));
}

/** Deeper routes — back link stays pinned below the main nav while scrolling. */
export function shouldPinBackLink(pathname: string): boolean {
  return !isNavLevel2Route(pathname);
}

export function shouldShowBottomNav(pathname: string): boolean {
  if (isPortalRoute(pathname)) return false;
  if (pathname.startsWith(AUTH_PREFIX)) return false;
  if (pathname.startsWith(REDIRECT_PREFIX)) return false;
  if (startsWithAny(pathname, BOTTOM_NAV_HIDDEN_AI)) return false;
  if (startsWithAny(pathname, BOTTOM_NAV_HIDDEN_TRYON)) return false;
  return true;
}

export function isCompactHeader(pathname: string): boolean {
  if (isPortalAppRoute(pathname)) return false;
  return shouldShowBottomNav(pathname);
}

export type MobileNavTab = "home" | "discover" | "ai" | "tryon" | "profile";

export function getActiveMobileNavTab(
  pathname: string,
  options?: { preferTryOn?: boolean },
): MobileNavTab | null {
  if (!shouldShowBottomNav(pathname)) return null;

  if (options?.preferTryOn && pathname.startsWith("/products/")) {
    return "tryon";
  }

  if (pathname === "/") return "home";
  if (
    pathname === "/discover" ||
    pathname.startsWith("/discover/") ||
    pathname.startsWith("/products/") ||
    pathname === "/similar-products"
  ) {
    return "discover";
  }
  if (pathname === "/ai/start" || pathname.startsWith("/ai/start/") || pathname === "/ai/chat" || pathname.startsWith("/ai/chat/")) return "ai";
  if (pathname === "/try-on" || pathname.startsWith("/try-on/brand/")) return "tryon";
  if (
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/wardrobe" ||
    pathname.startsWith("/wardrobe/") ||
    pathname === "/saved-outfits" ||
    pathname.startsWith("/saved-outfits/")
  ) {
    return "profile";
  }

  return null;
}
