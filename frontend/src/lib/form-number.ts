/** Parse optional number inputs without leaving NaN in form state. */
export function optionalNumberFormValue(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export const optionalNumberRegisterOptions = {
  setValueAs: optionalNumberFormValue,
} as const;

export const requiredNumberRegisterOptions = {
  valueAsNumber: true,
} as const;

/** Avoid resetting the form when parent re-renders with the same profile data. */
export function profileSnapshotKey(value: unknown): string {
  return JSON.stringify(value);
}
