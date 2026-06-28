import apiClient, { unwrap } from "./api-client";
import type { WardrobeItem } from "@/types/user";

export const wardrobeApi = {
  list: async (): Promise<WardrobeItem[]> => {
    const res = await apiClient.get("/wardrobe/items");
    return unwrap(res);
  },
  create: async (data: Omit<WardrobeItem, "id" | "createdAt">): Promise<WardrobeItem> => {
    const res = await apiClient.post("/wardrobe/items", {
      name: data.itemType,
      itemType: data.itemType,
      category: data.category,
      color: data.color,
      material: data.material,
      fitType: data.fit,
      styleTags: data.styleTags,
    });
    return unwrap(res);
  },
  update: async (id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> => {
    const res = await apiClient.put(`/wardrobe/items/${id}`, data);
    return unwrap(res);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/wardrobe/items/${id}`);
  },
  uploadImage: async (id: string, file: File): Promise<WardrobeItem> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post(`/wardrobe/items/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res);
  },
  recordConsent: async (): Promise<void> => {
    await apiClient.post("/uploads/user-photo/consent");
  },
};
