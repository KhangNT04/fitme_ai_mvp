export const PLACEHOLDER_PRODUCT = "/placeholder-product.svg";
/** Shown when a try-on photo lived on a provider link that has since been removed. */
export const EXPIRED_VTON_OUTPUT_PLACEHOLDER = "/placeholder-expired-tryon.svg";

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
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.includes("/outputs/")) return true;
    // The FASHN CDN serves /<job-id>/output_0.png and drops the file after a short while.
    return (
      pathname.endsWith("/output_0.png") &&
      (parsed.hostname.toLowerCase().endsWith("fashn.ai") ||
        parsed.hostname.toLowerCase().endsWith("fitme-ai-vton.onrender.com"))
    );
  } catch {
    const lower = url.toLowerCase();
    return lower.includes("/outputs/") || lower.includes("/output_0.png");
  }
}

/** Catalog photos and logos are public objects: browsers load them straight from the bucket. */
const PUBLIC_CATALOG_MEDIA_PREFIX = "/catalog-media/";

function normalizeUploadPath(url: string): string {
  if (url.startsWith("/uploads/")) return url;
  if (ABSOLUTE_URL.test(url) && url.includes(".r2.dev/")) {
    try {
      const pathname = new URL(url).pathname;
      if (pathname.startsWith(PUBLIC_CATALOG_MEDIA_PREFIX)) return url;
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
