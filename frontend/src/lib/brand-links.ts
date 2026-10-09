export const BRAND_LINK_FIELDS = [
  ["websiteUrl", "website"],
  ["shopeeUrl", "Shopee"],
  ["tiktokShopUrl", "TikTok Shop"],
  ["instagramUrl", "Instagram"],
  ["facebookUrl", "Facebook"],
] as const;

export type BrandLinkField = (typeof BRAND_LINK_FIELDS)[number][0];

/** "scheme:" prefix, but not "host:port" (e.g. "shop.vn:8080/x" has no scheme). */
const SCHEME_PREFIX = /^([a-z][a-z\d+.-]*):(?!\d)/i;

/**
 * Prepends https:// to links typed without a scheme ("shopee.vn/teelab") and lowercases an http(s) scheme,
 * which the backend compares case-sensitively. Other schemes ("javascript:") are left for validation to reject.
 */
export function normalizeWebLink(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const scheme = SCHEME_PREFIX.exec(trimmed)?.[1];
  if (!scheme) return `https://${trimmed}`;
  return /^https?$/i.test(scheme) ? scheme.toLowerCase() + trimmed.slice(scheme.length) : trimmed;
}

/** Mirrors the backend UrlValidator.isValidHttpUrl: http(s) with a dotted host. */
export function isValidWebLink(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Vietnamese inline error for a brand link input, or null when blank / valid after normalization. */
export function brandLinkError(value: string | null | undefined, label: string): string | null {
  const normalized = normalizeWebLink(value);
  if (!normalized || isValidWebLink(normalized)) return null;
  return `Link ${label} không hợp lệ, cần dạng https://...`;
}

/** Normalizes every brand link present in the payload; blank stays "" so the backend clears the field. */
export function normalizeBrandLinks<T extends Partial<Record<BrandLinkField, string | null | undefined>>>(data: T): T {
  const next = { ...data };
  for (const [field] of BRAND_LINK_FIELDS) {
    if (field in next && next[field] != null) {
      (next as Record<BrandLinkField, string>)[field] = normalizeWebLink(next[field]);
    }
  }
  return next;
}
