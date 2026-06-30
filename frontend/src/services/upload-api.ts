import apiClient, { unwrap } from "./api-client";
import { uploadMultipartFile } from "@/lib/upload-file";
import { resolveOptionalImageSrc } from "@/lib/media-url";

export interface PhotoQualityResult {
  photoUploadId: string;
  quality: "GOOD" | "ACCEPTABLE" | "POOR" | "INVALID";
  message: string;
  canProceed: boolean;
  fileUrl?: string;
}

export interface PreviewResult {
  id: string;
  imageUrl?: string;
  status: "PROCESSING" | "SUCCEEDED" | "FAILED";
  disclaimer: string;
  errorMessage?: string;
}

interface BackendPhotoUploadResponse {
  id: string;
  fileUrl?: string;
  qualityStatus?: string;
  status?: string;
}

interface BackendPreviewResponse {
  id: string;
  previewImageUrl?: string;
  imageUrl?: string;
  status?: string;
  disclaimer?: string;
  errorMessage?: string;
}

function normalizePhotoUpload(data: BackendPhotoUploadResponse): PhotoQualityResult {
  const quality = (data.qualityStatus || "POOR") as PhotoQualityResult["quality"];
  return {
    photoUploadId: data.id,
    quality,
    message:
      quality === "GOOD"
        ? "Ảnh đạt chất lượng tốt"
        : quality === "ACCEPTABLE"
          ? "Ảnh chấp nhận được"
          : "Ảnh chưa đạt yêu cầu",
    canProceed: quality === "GOOD" || quality === "ACCEPTABLE",
    fileUrl: resolveOptionalImageSrc(data.fileUrl),
  };
}

function normalizePreview(data: BackendPreviewResponse): PreviewResult {
  const rawStatus = (data.status || "PROCESSING").toUpperCase();
  const status: PreviewResult["status"] =
    rawStatus === "SUCCEEDED" || rawStatus === "COMPLETED"
      ? "SUCCEEDED"
      : rawStatus === "FAILED"
        ? "FAILED"
        : "PROCESSING";

  return {
    id: data.id,
    imageUrl: resolveOptionalImageSrc(data.previewImageUrl ?? data.imageUrl),
    status,
    disclaimer: data.disclaimer || "",
    errorMessage: data.errorMessage,
  };
}

export const uploadApi = {
  consent: async (): Promise<{ consentId: string }> => {
    const res = await apiClient.post("/uploads/user-photo/consent");
    const data = unwrap(res) as BackendPhotoUploadResponse;
    return { consentId: data.id };
  },
  uploadPhoto: async (file: File, consentId?: string): Promise<{ photoUploadId: string }> => {
    const data = await uploadMultipartFile<BackendPhotoUploadResponse>(
      "/uploads/user-photo",
      file,
      consentId ? { consentId } : undefined,
    );
    return { photoUploadId: data.id };
  },
  checkQuality: async (id: string): Promise<PhotoQualityResult> => {
    const res = await apiClient.get(`/uploads/user-photo/${id}/quality`);
    return normalizePhotoUpload(unwrap(res) as BackendPhotoUploadResponse);
  },
  deletePhoto: async (id: string): Promise<void> => {
    await apiClient.delete(`/uploads/user-photo/${id}`);
  },
};

export const previewApi = {
  create: async (data: {
    recommendationId: string;
    photoUploadId?: string | null;
    previewType: string;
  }): Promise<PreviewResult> => {
    const res = await apiClient.post("/previews", data);
    return normalizePreview(unwrap(res) as BackendPreviewResponse);
  },
  getById: async (id: string): Promise<PreviewResult> => {
    const res = await apiClient.get(`/previews/${id}`);
    return normalizePreview(unwrap(res) as BackendPreviewResponse);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/previews/${id}`);
  },
};
