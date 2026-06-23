import apiClient, { unwrap } from "./api-client";
import type { BodyProfile, StyleProfile } from "@/types/user";
import type { WardrobeItem } from "@/types/user";

export const profileApi = {
  getBodyProfile: async (): Promise<BodyProfile | null> => {
    const res = await apiClient.get("/me/body-profile");
    return unwrap(res);
  },
  saveBodyProfile: async (data: BodyProfile): Promise<BodyProfile> => {
    const payload = {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      fitPreference: data.fitPreference,
      skinTone: data.skinTone,
      goals: { items: data.goals },
      shoulderWidthCm: data.measurements?.shoulderWidthCm,
      chestCm: data.measurements?.chestCm,
      waistCm: data.measurements?.waistCm,
      abdomenCm: data.measurements?.abdomenCm,
      hipCm: data.measurements?.hipCm,
      thighCm: data.measurements?.thighCm,
      inseamCm: data.measurements?.inseamCm,
      armLengthCm: data.measurements?.armLengthCm,
    };
    const res = await apiClient.post("/me/body-profile", payload);
    return unwrap(res);
  },
  getStyleProfile: async (): Promise<StyleProfile | null> => {
    const res = await apiClient.get("/me/style-profile");
    return unwrap(res);
  },
  saveStyleProfile: async (data: StyleProfile): Promise<StyleProfile> => {
    const res = await apiClient.post("/me/style-profile", data);
    return unwrap(res);
  },
};

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
};
