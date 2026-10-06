import type { WardrobeMode } from "@/types/user";

export interface WardrobeModeOption {
  value: WardrobeMode;
  label: string;
  /** Needs FitMe Premium (uses the personal wardrobe). */
  premiumOnly: boolean;
  locked: boolean;
}

const OPTIONS: { value: WardrobeMode; label: string }[] = [
  { value: "NO_WARDROBE_DATA", label: "Chỉ đồ từ brand" },
  { value: "MIX_WARDROBE_AND_BRAND", label: "Kết hợp tủ đồ & brand" },
  { value: "USE_WARDROBE_FIRST", label: "Ưu tiên tủ đồ của tôi" },
];

/** Modes that read the personal wardrobe — FitMe Premium only. */
export function usesWardrobe(mode: WardrobeMode | null | undefined): boolean {
  return mode === "USE_WARDROBE_FIRST" || mode === "MIX_WARDROBE_AND_BRAND";
}

/** Mirrors the backend: Free users asking for their wardrobe get brand-only outfits. */
export function effectiveWardrobeMode(mode: WardrobeMode | null | undefined, premium: boolean): WardrobeMode {
  const requested = mode ?? "NO_WARDROBE_DATA";
  return usesWardrobe(requested) && !premium ? "NO_WARDROBE_DATA" : requested;
}

export function wardrobeModeOptions(premium: boolean): WardrobeModeOption[] {
  return OPTIONS.map((option) => {
    const premiumOnly = usesWardrobe(option.value);
    return { ...option, premiumOnly, locked: premiumOnly && !premium };
  });
}
