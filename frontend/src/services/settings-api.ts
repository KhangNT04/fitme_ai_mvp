import apiClient, { unwrap } from "./api-client";

export interface SystemSetting {
  key: string;
  value: number;
  defaultValue: number;
  label: string;
  description: string;
  min: number;
  max: number;
  updatedAt: string | null;
}

export const SYSTEM_SETTINGS_QUERY_KEY = ["admin-system-settings"] as const;

export const settingsApi = {
  list: async (): Promise<SystemSetting[]> => {
    const res = await apiClient.get("/admin/settings");
    const data = unwrap<SystemSetting[]>(res);
    return Array.isArray(data) ? data : [];
  },
  update: async (key: string, value: string): Promise<SystemSetting> => {
    const res = await apiClient.put(`/admin/settings/${encodeURIComponent(key)}`, { value });
    return unwrap(res);
  },
};

/** Client-side mirror of the backend validation; returns a Vietnamese error or null when valid. */
export function validateSettingValue(setting: Pick<SystemSetting, "label" | "min" | "max">, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return `Vui lòng nhập giá trị cho "${setting.label}"`;
  if (!/^-?\d+$/.test(trimmed)) return `"${setting.label}" phải là số nguyên`;
  const value = Number(trimmed);
  if (value < setting.min || value > setting.max) {
    return `"${setting.label}" phải nằm trong khoảng ${setting.min} - ${setting.max}`;
  }
  return null;
}
