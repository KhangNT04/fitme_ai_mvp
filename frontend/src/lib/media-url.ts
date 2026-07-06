export const PLACEHOLDER_PRODUCT = "/placeholder-product.svg";

const ABSOLUTE_URL = /^https?:\/\//i;

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
  const trimmed = normalizeUploadPath(url.trim());
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) return trimmed;
  return fallback;
}

export function resolveOptionalImageSrc(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = normalizeUploadPath(url.trim());
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) return trimmed;
  return undefined;
}

export function resolveImageList(urls: string[] | undefined | null, fallback = PLACEHOLDER_PRODUCT): string[] {
  const resolved = (urls ?? []).map((url) => resolveOptionalImageSrc(url)).filter(Boolean) as string[];
  return resolved.length > 0 ? resolved : [fallback];
}
