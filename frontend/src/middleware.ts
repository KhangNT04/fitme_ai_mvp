import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolvePortalRole } from "@/lib/portal-auth";

const PUBLIC_BRAND_PATHS = ["/brand/login", "/brand/onboarding", "/brand/pending"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await resolvePortalRole(request);

  if (pathname === "/admin/login" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (pathname === "/brand/login" && role === "BRAND") {
    return NextResponse.redirect(new URL("/brand/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
    if (role !== "ADMIN") {
      // Remember where the admin was headed so the sign-in can send them back.
      const target = new URL("/admin/login", request.url);
      target.searchParams.set("redirect", pathname);
      return NextResponse.redirect(target);
    }
  }

  if (pathname.startsWith("/brand") && !PUBLIC_BRAND_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "BRAND") {
      const target = new URL("/brand/login", request.url);
      target.searchParams.set("redirect", pathname);
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/brand/:path*", "/admin/:path*"],
};
