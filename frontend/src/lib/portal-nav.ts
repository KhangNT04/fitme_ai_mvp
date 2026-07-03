export interface PortalNavItem {
  href: string;
  label: string;
}

export const brandNav: PortalNavItem[] = [
  { href: "/brand/dashboard", label: "Tổng quan" },
  { href: "/brand/products", label: "Sản phẩm" },
  { href: "/brand/analytics", label: "Phân tích" },
  { href: "/brand/billing", label: "Gói & Thanh toán" },
  { href: "/brand/settings", label: "Cài đặt" },
];

export const adminNav: PortalNavItem[] = [
  { href: "/admin/dashboard", label: "Tổng quan" },
  { href: "/admin/brands", label: "Thương hiệu" },
  { href: "/admin/billing/plans", label: "Gói brand" },
  { href: "/admin/products/moderation", label: "Duyệt sản phẩm" },
  { href: "/admin/flagged-links", label: "Link bị gắn cờ" },
  { href: "/admin/rules/styles", label: "Quy tắc phong cách" },
  { href: "/admin/rules/occasions", label: "Quy tắc dịp" },
  { href: "/admin/analytics", label: "Phân tích" },
  { href: "/admin/privacy", label: "Quyền riêng tư" },
  { href: "/admin/try-on-monitoring", label: "Giám sát thử mặc" },
];

const PORTAL_AUTH_ROUTES = [
  "/brand/login",
  "/brand/onboarding",
  "/brand/pending",
  "/admin/login",
];

export function isPortalRoute(pathname: string): boolean {
  return pathname.startsWith("/brand") || pathname.startsWith("/admin");
}

export function isPortalAppRoute(pathname: string): boolean {
  if (!isPortalRoute(pathname)) return false;
  return !PORTAL_AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function getPortalNav(pathname: string): PortalNavItem[] | null {
  if (!isPortalAppRoute(pathname)) return null;
  return pathname.startsWith("/admin") ? adminNav : brandNav;
}

export function getPortalHomeHref(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/dashboard" : "/brand/dashboard";
}

export function getPortalLoginHref(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/brand/login";
}
