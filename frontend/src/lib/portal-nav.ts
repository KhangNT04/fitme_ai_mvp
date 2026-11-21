export interface PortalNavItem {
  href: string;
  label: string;
}

export interface PortalNavGroup {
  label: string;
  items: PortalNavItem[];
}

export const brandNavGroups: PortalNavGroup[] = [
  {
    label: "Vận hành",
    items: [
      { href: "/brand/dashboard", label: "Tổng quan" },
      { href: "/brand/products", label: "Sản phẩm" },
      { href: "/brand/inbox", label: "Inbox khách" },
      { href: "/brand/leads", label: "Khách quan tâm" },
    ],
  },
  {
    label: "Hiểu khách hàng",
    items: [
      { href: "/brand/insights/demand", label: "Nhu cầu Gen Z" },
      { href: "/brand/analytics", label: "Phân tích" },
    ],
  },
  {
    label: "Tài khoản",
    items: [
      { href: "/brand/plan", label: "Gói Plus" },
      { href: "/brand/settings", label: "Cài đặt" },
    ],
  },
];

export const adminNavGroups: PortalNavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/admin/dashboard", label: "Tổng quan" },
      { href: "/admin/traffic", label: "Thống kê truy cập" },
      { href: "/admin/analytics", label: "Phân tích tăng trưởng" },
    ],
  },
  {
    label: "Tài khoản & brand",
    items: [
      { href: "/admin/users", label: "Quản lý tài khoản" },
      { href: "/admin/brands", label: "Thương hiệu" },
      { href: "/admin/partnerships", label: "Đối tác" },
      { href: "/admin/audit-log", label: "Nhật ký quản trị" },
    ],
  },
  {
    label: "Nội dung & cộng đồng",
    items: [
      { href: "/admin/products/moderation", label: "Duyệt sản phẩm" },
      { href: "/admin/flagged-links", label: "Link bị gắn cờ" },
      { href: "/admin/community", label: "Cộng đồng" },
      { href: "/admin/shop-chat", label: "Chat shop" },
      { href: "/admin/reviews", label: "Đánh giá" },
      { href: "/admin/rewards", label: "Duyệt chia sẻ" },
    ],
  },
  {
    label: "Thương mại",
    items: [
      { href: "/admin/billing/plans", label: "Gói dịch vụ" },
      { href: "/admin/vouchers", label: "Voucher brand" },
      { href: "/admin/paying-customers", label: "Khách trả tiền" },
      { href: "/admin/retention", label: "Khách quay lại" },
    ],
  },
  {
    label: "AI & hệ thống",
    items: [
      { href: "/admin/try-on-monitoring", label: "Giám sát thử mặc" },
      { href: "/admin/tryon-avatars", label: "Avatar mẫu thử đồ" },
      { href: "/admin/rules/styles", label: "Quy tắc phong cách" },
      { href: "/admin/rules/occasions", label: "Quy tắc dịp mặc" },
      { href: "/admin/privacy", label: "Quyền riêng tư" },
      { href: "/admin/settings", label: "Cài đặt hệ thống" },
      { href: "/admin/account", label: "Tài khoản & bảo mật" },
    ],
  },
];

/** Flat lists kept for icon maps / tests / callers that expect a simple array. */
export const brandNav: PortalNavItem[] = brandNavGroups.flatMap((group) => group.items);
export const adminNav: PortalNavItem[] = adminNavGroups.flatMap((group) => group.items);

const PORTAL_AUTH_ROUTES = [
  "/brand/login",
  "/brand/onboarding",
  "/brand/pending",
  "/admin/login",
];

export function isPortalRoute(pathname: string): boolean {
  return pathname.startsWith("/brand") || pathname.startsWith("/admin");
}

export function isPortalAuthRoute(pathname: string): boolean {
  return PORTAL_AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPortalAppRoute(pathname: string): boolean {
  if (!isPortalRoute(pathname)) return false;
  return !isPortalAuthRoute(pathname);
}

export function getPortalNav(pathname: string): PortalNavItem[] | null {
  if (!isPortalAppRoute(pathname)) return null;
  return pathname.startsWith("/admin") ? adminNav : brandNav;
}

export function getPortalNavGroups(pathname: string): PortalNavGroup[] | null {
  if (!isPortalAppRoute(pathname)) return null;
  return pathname.startsWith("/admin") ? adminNavGroups : brandNavGroups;
}

export function getPortalHomeHref(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/dashboard" : "/brand/dashboard";
}

export function getPortalLoginHref(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/brand/login";
}

export function getPortalKind(pathname: string): "admin" | "brand" {
  return pathname.startsWith("/admin") ? "admin" : "brand";
}
