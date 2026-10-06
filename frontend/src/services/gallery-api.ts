import apiClient, { unwrap } from "./api-client";
import { GalleryImageDto } from "@/types";

export interface GalleryImagePage {
  items: GalleryImageDto[];
  page: number;
  size: number;
  total: number;
}

export const GALLERY_PAGE_SIZE = 24;

export function nextGalleryPage(last: GalleryImagePage): number | undefined {
  const loaded = (last.page + 1) * last.size;
  return last.items.length > 0 && loaded < last.total ? last.page + 1 : undefined;
}

export const galleryApi = {
  getImages: async (page = 0, size = GALLERY_PAGE_SIZE): Promise<GalleryImagePage> => {
    const res = await apiClient.get("/me/gallery", { params: { page, size } });
    const data = unwrap(res) as Partial<GalleryImagePage> | null;
    return {
      items: data?.items ?? [],
      page: data?.page ?? page,
      size: data?.size ?? size,
      total: data?.total ?? 0,
    };
  },
  deleteImage: async (id: string): Promise<void> => {
    const res = await apiClient.delete(`/me/gallery/${id}`);
    return unwrap(res);
  },
};
