export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const AI_DISCLAIMER =
  "Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc.";

export const FIT_PREFERENCES = [
  { value: "SLIM", label: "Ôm (Slim)" },
  { value: "REGULAR", label: "Vừa vặn (Regular)" },
  { value: "RELAXED", label: "Thoải mái (Relaxed)" },
  { value: "OVERSIZE", label: "Rộng (Oversize)" },
  { value: "UNSURE", label: "Chưa chắc" },
] as const;

export const SKIN_TONES = [
  { value: "FAIR", label: "Sáng" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "TAN", label: "Ngăm" },
  { value: "DEEP", label: "Đậm" },
  { value: "UNSURE", label: "Chưa chắc" },
] as const;

export const GENDERS = [
  { value: "FEMALE", label: "Nữ" },
  { value: "MALE", label: "Nam" },
  { value: "OTHER", label: "Khác" },
] as const;

/** Product design audience — used by AI scoring only; catalog shows all items to every user. */
export const TARGET_GENDERS = [
  { value: "UNISEX", label: "Unisex" },
  { value: "FEMALE", label: "Nữ" },
  { value: "MALE", label: "Nam" },
] as const;

export const RISK_LEVELS = [
  { value: "SAFE", label: "An toàn" },
  { value: "BALANCED", label: "Cân bằng" },
  { value: "BOLD", label: "Nổi bật" },
  { value: "EXPERIMENTAL", label: "Thử nghiệm" },
] as const;

export const STYLE_OPTIONS = [
  "Korean Casual",
  "Minimal",
  "Streetwear",
  "Office Chic",
  "Romantic",
  "Sporty",
  "Vintage",
  "Artistic",
] as const;

export const OCCASION_OPTIONS = [
  "Đi cafe",
  "Đi làm",
  "Hẹn hò",
  "Dự tiệc",
  "Đi chơi cuối tuần",
  "Du lịch",
  "Tập gym",
  "Ở nhà",
] as const;

export const VIBE_OPTIONS = [
  "Gọn gàng",
  "Nghệ nhưng vẫn gọn",
  "Thanh lịch",
  "Năng động",
  "Thoải mái",
  "Tự tin",
  "Nổi bật",
] as const;

export const WARDROBE_MODES = [
  { value: "NEW_ITEMS_ONLY", label: "Chỉ sản phẩm thương hiệu" },
  { value: "MIX_WARDROBE_AND_BRAND", label: "Kết hợp tủ đồ & thương hiệu" },
  { value: "USE_WARDROBE_FIRST", label: "Ưu tiên tủ đồ của tôi" },
  { value: "NO_WARDROBE_DATA", label: "Không dùng tủ đồ" },
] as const;

export const PRODUCT_CATEGORIES = [
  "Áo",
  "Quần",
  "Váy",
  "Áo khoác",
  "Giày",
  "Phụ kiện",
] as const;

export const TRY_ON_CATEGORIES = [
  { value: "top", label: "Áo / Top" },
  { value: "bottom", label: "Quần / Váy" },
  { value: "outerwear", label: "Áo khoác" },
  { value: "shoes", label: "Giày" },
  { value: "accessory", label: "Phụ kiện" },
] as const;

export const SESSION_STORAGE_KEY = "fitme_session_token";
export const AUTH_TOKEN_KEY = "fitme_access_token";
export const AUTH_REFRESH_KEY = "fitme_refresh_token";
