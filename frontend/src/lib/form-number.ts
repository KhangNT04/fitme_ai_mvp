/** Parse optional number inputs without leaving NaN in form state. */
export function optionalNumberFormValue(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** Whole-kilogram display/input — avoids DECIMAL(5,2) artifacts like 59.8 when user meant 60. */
export function normalizeKgWeight(value: number): number {
  return Math.round(value);
}

export function requiredKgWeightFormValue(value: unknown): number {
  if (value === "" || value == null) return Number.NaN;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? Number.NaN : normalizeKgWeight(n);
}

export const optionalNumberRegisterOptions = {
  setValueAs: optionalNumberFormValue,
} as const;

export const requiredNumberRegisterOptions = {
  valueAsNumber: true,
} as const;

export const requiredKgWeightRegisterOptions = {
  setValueAs: requiredKgWeightFormValue,
} as const;

/** Avoid resetting the form when parent re-renders with the same profile data. */
export function profileSnapshotKey(value: unknown): string {
  return JSON.stringify(value);
}
