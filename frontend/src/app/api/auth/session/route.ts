import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Sync role cookie from access token payload (client-side decode, MVP guard only). */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const parts = accessToken.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const role = payload.role === "BRAND_OWNER" ? "BRAND" : payload.role === "ADMIN" ? "ADMIN" : "USER";
    const response = NextResponse.json({ role });
    response.cookies.set("fitme-role", role, { path: "/", maxAge: 86400, sameSite: "lax" });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
}
