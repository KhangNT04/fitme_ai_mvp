import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export type PortalRole = "ADMIN" | "BRAND" | "USER";

export const PORTAL_ACCESS_COOKIE = "fitme-access";
export const PORTAL_ROLE_COOKIE = "fitme-role";

const DEV_JWT_FALLBACK =
  "fitme-dev-secret-change-in-production-min-256-bits-long-key-here";

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "development" ? DEV_JWT_FALLBACK : undefined);
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export function portalRoleFromJwtRole(role: unknown): PortalRole | null {
  if (role === "ADMIN") return "ADMIN";
  if (role === "BRAND_OWNER" || role === "BRAND") return "BRAND";
  if (role === "USER") return "USER";
  return null;
}

export async function verifyAccessToken(token: string): Promise<PortalRole | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.type !== "access") return null;
    return portalRoleFromJwtRole(payload.role);
  } catch {
    return null;
  }
}

export async function resolvePortalRole(request: NextRequest): Promise<PortalRole | null> {
  const accessToken = request.cookies.get(PORTAL_ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  return verifyAccessToken(accessToken);
}

export function portalCookieOptions() {
  return {
    path: "/",
    maxAge: 86400,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
