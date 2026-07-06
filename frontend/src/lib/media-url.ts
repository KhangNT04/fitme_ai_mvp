export const PLACEHOLDER_PRODUCT = "/placeholder-product.svg";
export const EXPIRED_VTON_OUTPUT_PLACEHOLDER = "/placeholder-product.svg";

const ABSOLUTE_URL = /^https?:\/\//i;

export function isBlobPreviewUrl(url?: string | null): boolean {
  return !!url?.trim().startsWith("blob:");
}

/** True when URL is safe to persist or reuse after page reload (not an expired blob). */
export function isServerPreviewUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return !isBlobPreviewUrl(url);
}

/** Ephemeral ai-vton output URLs are lost after service redeploy. */
export function isEphemeralVtonOutputUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.pathname.toLowerCase().includes("/outputs/");
  } catch {
    return url.toLowerCase().includes("/outputs/");
  }
}

function normalizeUploadPath(url: string): string {
  if (url.startsWith("/uploads/")) return url;
  if (ABSOLUTE_URL.test(url) && url.includes(".r2.dev/")) {
    try {
      const pathname = new URL(url).pathname;
      if (pathname.startsWith("/uploads/")) return pathname;
      return `/uploads${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
    } catch {
      return url;
    }
  }
  return url;
}

/** Resolve API/storage paths to a browser-ready `src` for `<Image>` / `<img>`. */
export function resolveImageSrc(url?: string | null, fallback = PLACEHOLDER_PRODUCT): string {
  if (!url?.trim()) return fallback;
  if (isEphemeralVtonOutputUrl(url)) return EXPIRED_VTON_OUTPUT_PLACEHOLDER;
  const trimmed = normalizeUploadPath(url.trim());
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) return trimmed;
  return fallback;
}

export function resolveOptionalImageSrc(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  if (isEphemeralVtonOutputUrl(url)) return EXPIRED_VTON_OUTPUT_PLACEHOLDER;
  const trimmed = normalizeUploadPath(url.trim());
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) return trimmed;
  return undefined;
}

export function resolveImageList(urls: string[] | undefined | null, fallback = PLACEHOLDER_PRODUCT): string[] {
  const resolved = (urls ?? []).map((url) => resolveOptionalImageSrc(url)).filter(Boolean) as string[];
  return resolved.length > 0 ? resolved : [fallback];
}
