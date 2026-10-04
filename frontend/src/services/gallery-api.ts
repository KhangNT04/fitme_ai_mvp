import apiClient, { unwrap } from "./api-client";
import { GalleryImageDto } from "@/types";

export const galleryApi = {
  getImages: async (page = 0, size = 20): Promise<{ items: GalleryImageDto[]; totalCount: number }> => {
    const res = await apiClient.get("/me/gallery", { params: { page, size } });
    return unwrap(res);
  },
  deleteImage: async (id: string): Promise<void> => {
    const res = await apiClient.delete(`/me/gallery/${id}`);
    return unwrap(res);
  },
};
