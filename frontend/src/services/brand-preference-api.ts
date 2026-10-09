import apiClient, { unwrap } from "./api-client";

export type BrandMixMode = "DIVERSE" | "FAVORITES_ONLY";

export interface FavoriteBrandRef {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface BrandPreferences {
  mode: BrandMixMode;
  brandIds: string[];
  brands: FavoriteBrandRef[];
  premium: boolean;
}

export interface BrandPreferencesUpdate {
  mode: BrandMixMode;
  brandIds: string[];
}

export const MAX_FAVORITE_BRANDS = 10;

export const BRAND_PREFERENCES_QUERY_KEY = ["brand-preferences"] as const;

export const BRAND_MIX_MODE_OPTIONS: { value: BrandMixMode; label: string; description: string }[] = [
  {
    value: "DIVERSE",
    label: "Đa dạng nhiều brand",
    description: "Ưu tiên nhẹ brand bạn thích nhưng vẫn phối cùng các brand khác.",
  },
  {
    value: "FAVORITES_ONLY",
    label: "Chỉ brand yêu thích",
    description: "Chỉ gợi ý sản phẩm từ brand bạn yêu thích; nếu không đủ món sẽ hiển thị outfit chưa đầy đủ.",
  },
];

export const brandPreferenceApi = {
  get: async (): Promise<BrandPreferences> => {
    const res = await apiClient.get("/me/brand-preferences");
    return unwrap(res);
  },
  update: async (data: BrandPreferencesUpdate): Promise<BrandPreferences> => {
    const res = await apiClient.put("/me/brand-preferences", data);
    return unwrap(res);
  },
};

/** Toggles a brand in the favorite list, refusing to go past {@link MAX_FAVORITE_BRANDS}. */
export function toggleFavoriteBrand(selected: string[], brandId: string): string[] {
  if (selected.includes(brandId)) return selected.filter((id) => id !== brandId);
  if (selected.length >= MAX_FAVORITE_BRANDS) return selected;
  return [...selected, brandId];
}

/** Vietnamese validation error mirroring the backend, or null when the selection can be saved. */
export function validateBrandPreferences(data: BrandPreferencesUpdate): string | null {
  if (data.brandIds.length > MAX_FAVORITE_BRANDS) {
    return `Chỉ chọn tối đa ${MAX_FAVORITE_BRANDS} brand yêu thích`;
  }
  if (data.mode === "FAVORITES_ONLY" && data.brandIds.length === 0) {
    return "Chọn ít nhất 1 brand để dùng chế độ chỉ brand yêu thích";
  }
  return null;
}
