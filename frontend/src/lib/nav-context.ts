import { getPreviousNavEntry, isTryOnRouteHref, type NavHistoryEntry } from "./nav-history";

export const TRYON_FROM_PARAM = "try-on";
export const AI_RESULT_FROM_PARAM = "ai-result";
export const AI_CHAT_FROM_PARAM = "ai-chat";
export const RECOMMENDATION_PARAM = "recommendation";
export const NAV_CONTEXT_STORAGE_KEY = "fitme-nav-context";

export type ConsumerNavContext = "discover" | "tryon";

export function setConsumerNavContext(context: ConsumerNavContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NAV_CONTEXT_STORAGE_KEY, context);
}

export function getConsumerNavContext(): ConsumerNavContext | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(NAV_CONTEXT_STORAGE_KEY);
  return value === "discover" || value === "tryon" ? value : null;
}

export function productDetailHref(productId: string, context?: ConsumerNavContext): string {
  if (context === "tryon") {
    return `/products/${productId}?from=${TRYON_FROM_PARAM}`;
  }
  return `/products/${productId}`;
}

export function productDetailFromAiResultHref(productId: string, recommendationId: string): string {
  return `/products/${productId}?from=${AI_RESULT_FROM_PARAM}&${RECOMMENDATION_PARAM}=${recommendationId}`;
}

export function productDetailFromAiChatHref(productId: string): string {
  return `/products/${productId}?from=${AI_CHAT_FROM_PARAM}`;
}

export const DISCOVER_HUB: NavHistoryEntry = {
  href: "/discover",
  label: "Khám phá sản phẩm",
};

export const TRYON_HUB: NavHistoryEntry = {
  href: "/try-on",
  label: "Thử mặc AI",
};

export const AI_START_HUB: NavHistoryEntry = {
  href: "/ai/start",
  label: "Tư vấn AI",
};

export const AI_CHAT_HUB: NavHistoryEntry = {
  href: "/ai/chat",
  label: "Tư vấn outfit AI",
};

export const SAVED_OUTFITS_HUB: NavHistoryEntry = {
  href: "/saved-outfits",
  label: "Đã lưu",
};

export const SAVED_FROM_PARAM = "saved";

type SearchLike = { get(name: string): string | null } | null | undefined;

export function isFromSavedList(search: SearchLike): boolean {
  return search?.get("from") === SAVED_FROM_PARAM;
}

/** Fallback back target for AI / try-on result pages opened from Đã lưu. */
export function resolveSavedResultBack(
  kind: "ai" | "tryon",
  fromSaved: boolean,
): NavHistoryEntry {
  if (fromSaved) return SAVED_OUTFITS_HUB;
  return kind === "ai" ? DISCOVER_HUB : TRYON_HUB;
}

function pathOnly(href: string): string {
  return href.split("?")[0].replace(/\/$/, "") || "/";
}

/** Try-on wizard steps — back from product info should name the hub, not the step. */
export function isTryOnWizardStep(href: string): boolean {
  const path = pathOnly(href);
  return path === "/try-on/selected" || path === "/try-on/input" || path === "/try-on/processing";
}

/** AI consultation wizard steps — back from product info should name the hub, not the step. */
export function isAiWizardStep(href: string): boolean {
  const path = pathOnly(href);
  return (
    path === "/ai/body-profile" ||
    path === "/ai/processing" ||
    path.startsWith("/ai/options") ||
    path === "/ai/photo-check" ||
    path === "/ai/photo-upload" ||
    path === "/ai/preview-outfit"
  );
}

/**
 * Product detail ("thông tin sản phẩm") back target — never show intermediate wizard step labels.
 */
export function resolveProductPageBack(
  stack: readonly NavHistoryEntry[],
  options?: {
    fromTryOn?: boolean;
    fromAiResult?: boolean;
    fromAiChat?: boolean;
    recommendationId?: string | null;
  },
): NavHistoryEntry {
  if (options?.fromTryOn) return TRYON_HUB;

  if (options?.fromAiChat) return AI_CHAT_HUB;

  if (options?.fromAiResult && options.recommendationId) {
    return {
      href: `/ai/result/${options.recommendationId}`,
      label: "Kết quả tư vấn",
    };
  }

  if (stack.length >= 2) {
    const prev = stack[stack.length - 2];
    const path = pathOnly(prev.href);

    if (path === "/try-on" || isTryOnWizardStep(prev.href)) return TRYON_HUB;

    if (isTryOnRouteHref(prev.href)) {
      if (path.startsWith("/try-on/result") || path.startsWith("/try-on/decision")) {
        return { href: path, label: "Kết quả thử mặc AI" };
      }
    }

    if (path === "/ai/chat" || path.startsWith("/ai/chat")) return AI_CHAT_HUB;

    if (isAiWizardStep(prev.href)) return AI_START_HUB;

    if (path === "/discover") return DISCOVER_HUB;

    if (path.startsWith("/ai/result") || path.startsWith("/ai/variants")) {
      return { href: path, label: "Kết quả tư vấn" };
    }

    if (path === "/similar-products") {
      return { href: "/similar-products", label: "Sản phẩm tương tự" };
    }

    if (path.startsWith("/products/")) return DISCOVER_HUB;
  }

  return DISCOVER_HUB;
}

/** Whether consumer chrome should treat the session as try-on flow (bottom nav). */
export function isTryOnNavContext(pathname: string, search?: SearchLike): boolean {
  if (pathname === "/try-on") return true;

  if (search?.get("from") === TRYON_FROM_PARAM) return true;

  const previous = getPreviousNavEntry();
  if (pathname.startsWith("/products/") && previous && isTryOnRouteHref(previous.href)) {
    return true;
  }

  if (pathname.startsWith("/products/") && getConsumerNavContext() === "tryon") {
    return true;
  }

  return false;
}
