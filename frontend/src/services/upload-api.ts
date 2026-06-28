import apiClient, { unwrap } from "./api-client";

export interface PhotoQualityResult {
  photoUploadId: string;
  quality: "GOOD" | "ACCEPTABLE" | "POOR" | "INVALID";
  message: string;
  canProceed: boolean;
}

export interface PreviewResult {
  id: string;
  imageUrl?: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  disclaimer: string;
}

interface BackendPhotoUploadResponse {
  id: string;
  fileUrl?: string;
  qualityStatus?: string;
  status?: string;
}

function normalizePhotoUpload(data: BackendPhotoUploadResponse): PhotoQualityResult {
  const quality = (data.qualityStatus || "POOR") as PhotoQualityResult["quality"];
  return {
    photoUploadId: data.id,
    quality,
    message: quality === "GOOD" ? "Ảnh đạt chất lượng tốt" : quality === "ACCEPTABLE" ? "Ảnh chấp nhận được" : "Ảnh chưa đạt yêu cầu",
    canProceed: quality === "GOOD" || quality === "ACCEPTABLE",
  };
}

export const uploadApi = {
  consent: async (): Promise<void> => {
    await apiClient.post("/uploads/user-photo/consent");
  },
  uploadPhoto: async (file: File): Promise<{ photoUploadId: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/uploads/user-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = unwrap(res) as BackendPhotoUploadResponse;
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
    return unwrap(res);
  },
  getById: async (id: string): Promise<PreviewResult> => {
    const res = await apiClient.get(`/previews/${id}`);
    return unwrap(res);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/previews/${id}`);
  },
};
