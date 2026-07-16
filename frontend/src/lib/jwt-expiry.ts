/** Returns true if the JWT is missing, malformed, or past `exp`. */
export function isJwtExpired(token: string | null | undefined, skewSeconds = 30): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof json.exp !== "number") return true;
    return json.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}
