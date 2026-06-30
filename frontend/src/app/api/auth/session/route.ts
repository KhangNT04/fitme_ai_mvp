import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PORTAL_ACCESS_COOKIE,
  PORTAL_ROLE_COOKIE,
  portalCookieOptions,
  portalRoleFromJwtRole,
  verifyAccessToken,
} from "@/lib/portal-auth";

/** Set httpOnly portal cookies after JWT signature verification. */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const role = await verifyAccessToken(accessToken);
    if (!role) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const response = NextResponse.json({ role });
    const options = portalCookieOptions();
    response.cookies.set(PORTAL_ACCESS_COOKIE, accessToken, options);
    response.cookies.set(PORTAL_ROLE_COOKIE, role, options);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
}

/** Clear portal cookies on logout. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  const clear = { path: "/", maxAge: 0 };
  response.cookies.set(PORTAL_ACCESS_COOKIE, "", clear);
  response.cookies.set(PORTAL_ROLE_COOKIE, "", clear);
  return response;
}
