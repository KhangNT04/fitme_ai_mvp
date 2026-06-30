import apiClient, { unwrap } from "./api-client";
import { resolveOptionalImageSrc } from "@/lib/media-url";
import type { TryOnResult, TryOnInput } from "@/types/tryon";

function mapCategoryToRole(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("quần") || lower.includes("bottom")) return "BOTTOM";
  if (lower.includes("giày") || lower.includes("shoe")) return "SHOES";
  if (lower.includes("khoác") || lower.includes("outer")) return "OUTERWEAR";
  if (lower.includes("váy") || lower.includes("dress")) return "ONE_PIECE";
  return "TOP";
}

interface CreateTryOnPayload {
  heightCm: number;
  weightKg: number;
  fitPreference?: string;
  skinTone?: string;
  occasion?: string;
  desiredVibe?: string;
}

export const tryonApi = {
  create: async (data: CreateTryOnPayload): Promise<{ id: string }> => {
    const res = await apiClient.post("/try-on/requests", {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      ...(data.fitPreference ? { preferredFit: data.fitPreference } : {}),
      ...(data.skinTone ? { skinTone: data.skinTone } : {}),
      ...(data.occasion ? { occasion: data.occasion } : {}),
      ...(data.desiredVibe ? { desiredVibe: data.desiredVibe } : {}),
    });
    const body = unwrap(res) as { id: string };
    return { id: body.id };
  },
  addItem: async (requestId: string, productId: string, category: string): Promise<void> => {
    await apiClient.post(`/try-on/requests/${requestId}/items`, {
      productId,
      role: mapCategoryToRole(category),
    });
  },
  getById: async (id: string): Promise<TryOnResult> => {
    const res = await apiClient.get(`/try-on/requests/${id}`);
    return unwrap(res) as TryOnResult;
  },
  generate: async (id: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/generate`);
    return unwrap(res) as TryOnResult;
  },
  getResult: async (id: string): Promise<TryOnResult> => {
    const res = await apiClient.get(`/try-on/requests/${id}/result`);
    const data = unwrap(res) as {
      id: string;
      status: TryOnResult["status"];
      previewImageUrl?: string;
      disclaimer?: string;
      items?: TryOnResult["items"];
    };
    return {
      id: data.id,
      status: data.status,
      previewImageUrl: resolveOptionalImageSrc(data.previewImageUrl),
      disclaimer: data.disclaimer || "",
      items: data.items || [],
      improvementSuggestions: [],
    };
  },
  variantColor: async (id: string, color: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/color`, { color });
    return unwrap(res) as TryOnResult;
  },
  variantSize: async (id: string, size: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/size`, { size });
    return unwrap(res) as TryOnResult;
  },
  variantForm: async (id: string, form: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/form`, { form });
    return unwrap(res) as TryOnResult;
  },
  save: async (id: string): Promise<void> => {
    await apiClient.post(`/try-on/requests/${id}/save`);
  },
  feedback: async (id: string, rating: string, comment?: string): Promise<void> => {
    await apiClient.post(`/try-on/requests/${id}/feedback`, { rating, comment });
  },
};

export type { TryOnInput };
