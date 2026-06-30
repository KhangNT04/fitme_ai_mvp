import { FIT_PREFERENCES } from "@/utils/constants";
import type { FitPreference } from "@/types/user";

export function fitPreferenceLabel(value?: FitPreference | string | null): string {
  if (!value) return "Vừa vặn (Regular)";
  const found = FIT_PREFERENCES.find((f) => f.value === value);
  return found?.label ?? String(value);
}

export function isOversizeFit(value?: FitPreference | string | null): boolean {
  return value === "OVERSIZE";
}
