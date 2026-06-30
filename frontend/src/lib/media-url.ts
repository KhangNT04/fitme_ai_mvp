export const PLACEHOLDER_PRODUCT = "/placeholder-product.svg";

const ABSOLUTE_URL = /^https?:\/\//i;

/** Resolve API/storage paths to a browser-ready `src` for `<Image>` / `<img>`. */
export function resolveImageSrc(url?: string | null, fallback = PLACEHOLDER_PRODUCT): string {
  if (!url?.trim()) return fallback;
  const trimmed = url.trim();
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  return fallback;
}

export function resolveOptionalImageSrc(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (ABSOLUTE_URL.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  return undefined;
}

export function resolveImageList(urls: string[] | undefined | null, fallback = PLACEHOLDER_PRODUCT): string[] {
  const resolved = (urls ?? []).map((url) => resolveOptionalImageSrc(url)).filter(Boolean) as string[];
  return resolved.length > 0 ? resolved : [fallback];
}
