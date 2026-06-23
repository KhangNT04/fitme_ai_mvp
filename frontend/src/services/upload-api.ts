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
    return unwrap(res);
  },
  checkQuality: async (id: string): Promise<PhotoQualityResult> => {
    const res = await apiClient.get(`/uploads/user-photo/${id}/quality`);
    return unwrap(res);
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
