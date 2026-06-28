import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_BRAND_PATHS = ["/brand/login", "/brand/onboarding", "/brand/pending"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("fitme-role")?.value;

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/brand") && !PUBLIC_BRAND_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "BRAND") {
      return NextResponse.redirect(new URL("/brand/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/brand/:path*", "/admin/:path*"],
};
