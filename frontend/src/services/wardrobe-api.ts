import apiClient, { unwrap } from "./api-client";
import { privacyApi } from "./privacy-api";
import { uploadMultipartFile } from "@/lib/upload-file";
import { resolveOptionalImageSrc } from "@/lib/media-url";
import type { WardrobeItem } from "@/types/user";

interface BackendWardrobeItem {
  id: string;
  name?: string;
  itemType?: string;
  category: string;
  color?: string;
  material?: string;
  fitType?: string;
  styleTags?: string[];
  imageUrl?: string;
  createdAt: string;
}

function mapWardrobeItem(raw: BackendWardrobeItem): WardrobeItem {
  return {
    id: raw.id,
    itemType: raw.name || raw.itemType || "Item",
    category: raw.category,
    color: raw.color || "",
    material: raw.material,
    fit: raw.fitType,
    styleTags: raw.styleTags ?? [],
    imageUrl: resolveOptionalImageSrc(raw.imageUrl),
    createdAt: raw.createdAt,
  };
}

export const wardrobeApi = {
  list: async (): Promise<WardrobeItem[]> => {
    const res = await apiClient.get("/wardrobe/items");
    const data = unwrap(res) as BackendWardrobeItem[];
    return (Array.isArray(data) ? data : []).map(mapWardrobeItem);
  },
  create: async (data: Omit<WardrobeItem, "id" | "createdAt">): Promise<WardrobeItem> => {
    const res = await apiClient.post("/wardrobe/items", {
      name: data.itemType,
      itemType: data.itemType,
      category: data.category,
      ...(data.color ? { color: data.color } : {}),
      ...(data.material ? { material: data.material } : {}),
      ...(data.fit ? { fitType: data.fit } : {}),
      styleTags: data.styleTags ?? [],
    });
    return mapWardrobeItem(unwrap(res) as BackendWardrobeItem);
  },
  update: async (id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> => {
    const res = await apiClient.put(`/wardrobe/items/${id}`, {
      ...(data.itemType ? { name: data.itemType, itemType: data.itemType } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.material !== undefined ? { material: data.material } : {}),
      ...(data.fit !== undefined ? { fitType: data.fit } : {}),
      ...(data.styleTags ? { styleTags: data.styleTags } : {}),
    });
    return mapWardrobeItem(unwrap(res) as BackendWardrobeItem);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/wardrobe/items/${id}`);
  },
  uploadImage: async (id: string, file: File): Promise<WardrobeItem> => {
    const data = await uploadMultipartFile<BackendWardrobeItem>(`/wardrobe/items/${id}/image`, file);
    return mapWardrobeItem(data);
  },
  recordConsent: async (): Promise<void> => {
    await privacyApi.recordConsent("WARDROBE_IMAGE_UPLOAD", true);
  },
};
