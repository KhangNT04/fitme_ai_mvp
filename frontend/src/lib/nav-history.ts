export const NAV_HISTORY_STORAGE_KEY = "fitme-nav-history";

export interface NavHistoryEntry {
  href: string;
  label: string;
}

function readStack(): NavHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NavHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStack(stack: NavHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NAV_HISTORY_STORAGE_KEY, JSON.stringify(stack));
  cachedStackKey = "";
}

export function normalizeNavHref(pathname: string, search = ""): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

export function labelForHref(href: string): string {
  const path = href.split("?")[0].replace(/\/$/, "") || "/";

  const exact: Record<string, string> = {
    "/": "Trang chủ",
    "/discover": "Khám phá sản phẩm",
    "/try-on": "Thử mặc AI",
    "/try-on/selected": "Outfit đang chọn",
    "/try-on/input": "Thông tin thử mặc",
    "/try-on/processing": "Đang xử lý thử mặc",
    "/profile": "Hồ sơ của tôi",
    "/profile/privacy": "Quyền riêng tư & dữ liệu",
    "/profile/body": "Chỉnh sửa hồ sơ cơ thể",
    "/profile/style": "Chỉnh sửa gu thời trang",
    "/ai/start": "Tư vấn AI",
    "/ai/body-profile": "Thông tin cơ thể",
    "/ai/style-profile": "Gu thời trang",
    "/ai/occasion": "Hoàn cảnh & vibe",
    "/ai/processing": "Đang xử lý tư vấn",
    "/ai/photo-upload": "Upload ảnh",
    "/ai/preview-outfit": "Chỉnh set outfit",
    "/ai/photo-check": "Kiểm tra ảnh",
    "/wardrobe": "Tủ đồ cá nhân",
    "/saved-outfits": "Gợi ý đã lưu",
    "/similar-products": "Sản phẩm tương tự",
    "/auth/login": "Đăng nhập",
    "/auth/register": "Đăng ký",
    "/auth/forgot-password": "Quên mật khẩu",
    "/auth/reset-password": "Đặt lại mật khẩu",
    "/brand/onboarding": "Đăng ký Brand",
    "/brand/pending": "Trạng thái đơn Brand",
    "/brand/login": "Brand Portal",
    "/admin/login": "Admin Portal",
  };

  if (exact[path]) return exact[path];
  if (path.startsWith("/discover/brand/")) return "Thương hiệu";
  if (path.startsWith("/try-on/brand/")) return "Thử mặc theo thương hiệu";
  if (path.startsWith("/products/")) return "Thông tin sản phẩm";
  if (path.startsWith("/try-on/result/")) return "Kết quả thử mặc AI";
  if (path.startsWith("/try-on/size/")) return "Kết quả thử mặc AI";
  if (path.startsWith("/try-on/form/")) return "Kết quả thử mặc AI";
  if (path.startsWith("/try-on/color/")) return "Kết quả thử mặc AI";
  if (path.startsWith("/try-on/decision/")) return "Kết quả thử mặc AI";
  if (path.startsWith("/ai/result/")) return "Kết quả tư vấn";
  if (path.startsWith("/ai/preview/")) return "Preview AI";
  if (path.startsWith("/ai/variants/")) return "Kết quả tư vấn";
  if (path.startsWith("/redirect/confirm/")) return "Chi tiết sản phẩm";

  return "Quay lại";
}

let cachedStack: NavHistoryEntry[] = [];
let cachedStackKey = "";

export function getNavHistorySnapshot(): readonly NavHistoryEntry[] {
  const stack = readStack();
  const key = stack.map((entry) => `${entry.href}\0${entry.label}`).join("\n");
  if (key !== cachedStackKey) {
    cachedStackKey = key;
    cachedStack = stack;
  }
  return cachedStack;
}

export function getNavHistoryStack(): NavHistoryEntry[] {
  return [...getNavHistorySnapshot()];
}

export function getPreviousNavEntry(): NavHistoryEntry | null {
  const stack = readStack();
  if (stack.length < 2) return null;
  return stack[stack.length - 2];
}

export function recordNavVisit(fullPath: string): void {
  const stack = readStack();
  const last = stack[stack.length - 1];

  if (last?.href === fullPath) return;

  const existingIndex = stack.findIndex((entry) => entry.href === fullPath);
  if (existingIndex >= 0) {
    stack.splice(existingIndex + 1);
    writeStack(stack);
    return;
  }

  stack.push({ href: fullPath, label: labelForHref(fullPath) });
  if (stack.length > 40) {
    stack.splice(0, stack.length - 40);
  }
  writeStack(stack);
}

export function popNavHistory(): void {
  const stack = readStack();
  if (stack.length > 0) {
    stack.pop();
    writeStack(stack);
  }
}

export function resolveNavBack(
  fallback: NavHistoryEntry,
  stack: readonly NavHistoryEntry[] = getNavHistorySnapshot(),
): NavHistoryEntry {
  if (stack.length < 2) return fallback;
  return stack[stack.length - 2];
}

export function isTryOnRouteHref(href: string): boolean {
  const path = href.split("?")[0];
  return path === "/try-on" || path.startsWith("/try-on/");
}

export function notifyNavHistoryChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("fitme-nav-history"));
}
