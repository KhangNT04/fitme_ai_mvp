import apiClient, { unwrap } from "@/services/api-client";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: File): string | null {
  if (!file) return "Chưa chọn file ảnh.";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Ảnh tối đa 5MB.";
  }
  return null;
}

export async function uploadMultipartFile<T>(
  path: string,
  file: File,
  params?: Record<string, string>,
): Promise<T> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("file", file);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      formData.append(key, value);
    }
  }

  const res = await apiClient.post(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res) as T;
}
