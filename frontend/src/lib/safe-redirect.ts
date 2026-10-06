/**
 * Returns `raw` only when it is a same-origin path. Browsers treat `\` like `/`, so `/\evil.com`
 * would otherwise become the protocol-relative `//evil.com`.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\u0000-\u001f]/.test(value)) return null;
  return value;
}

export function safeInternalPathOr(raw: string | null | undefined, fallback: string): string {
  return safeInternalPath(raw) ?? fallback;
}
