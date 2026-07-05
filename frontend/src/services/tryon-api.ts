import apiClient, { unwrap, type ApiError } from "./api-client";
import { mapCategoryToRole } from "@/lib/tryon-role";
import { resolveOptionalImageSrc } from "@/lib/media-url";
import type { TryOnResult, TryOnInputMode, TryOnPreviewType, OutfitSuggestions, TryOnSuggestedItem, TryOnItem } from "@/types/tryon";

interface CreateTryOnPayload {
  heightCm: number;
  weightKg: number;
  fitPreference?: string;
  skinTone?: string;
  occasion?: string;
  desiredVibe?: string;
  usualSize?: string;
  previewMode: TryOnInputMode;
  photoUploadId?: string;
  avatarKey?: string;
}

type RawTryOnItem = {
  productId: string;
  role?: string;
  name?: string;
  category?: string;
  imageUrl?: string;
  selectedSize?: string;
  selectedColor?: string;
  suggestedSize?: string;
  price?: number;
  canBuy?: boolean;
};

type RawTryOnResult = {
  id: string;
  status: TryOnResult["status"];
  previewMode?: TryOnInputMode;
  previewType?: TryOnPreviewType;
  outfitComplete?: boolean;
  saved?: boolean;
  previewImageUrl?: string;
  disclaimer?: string;
  errorMessage?: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  improvementSuggestions?: string[];
  suggestedItems?: TryOnSuggestedItem[];
  items?: RawTryOnItem[];
};

function mapTryOnItem(item: RawTryOnItem): TryOnItem {
  const selectedSize = item.selectedSize ?? item.suggestedSize;
  const selectedColor = item.selectedColor;
  return {
    productId: item.productId,
    name: item.name ?? "",
    category: item.category ?? "",
    imageUrl: resolveOptionalImageSrc(item.imageUrl),
    role: item.role,
    selectedSize,
    selectedColor,
    suggestedSize: item.suggestedSize,
    size: selectedSize,
    color: selectedColor,
    price: item.price,
    canBuy: item.canBuy,
  };
}

function mapTryOnResult(data: RawTryOnResult): TryOnResult {
  return {
    id: data.id,
    status: data.status,
    previewMode: data.previewMode,
    previewType: data.previewType,
    outfitComplete: data.outfitComplete,
    saved: data.saved,
    previewImageUrl: resolveOptionalImageSrc(data.previewImageUrl),
    disclaimer: data.disclaimer || "",
    errorMessage: data.errorMessage,
    recommendedSize: data.recommendedSize,
    alternativeSize: data.alternativeSize,
    recommendedForm: data.recommendedForm,
    recommendedColor: data.recommendedColor,
    items: (data.items ?? []).map(mapTryOnItem),
    improvementSuggestions: data.improvementSuggestions ?? [],
    suggestedItems: (data.suggestedItems ?? []).map((item) => ({
      ...item,
      imageUrl: resolveOptionalImageSrc(item.imageUrl),
    })),
  };
}

export const tryonApi = {
  create: async (data: CreateTryOnPayload): Promise<{ id: string }> => {
    const res = await apiClient.post("/try-on/requests", {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      previewMode: data.previewMode,
      ...(data.photoUploadId ? { photoUploadId: data.photoUploadId } : {}),
      ...(data.avatarKey ? { avatarKey: data.avatarKey } : {}),
      ...(data.fitPreference ? { preferredFit: data.fitPreference } : {}),
      ...(data.skinTone ? { skinTone: data.skinTone } : {}),
      ...(data.occasion ? { occasion: data.occasion } : {}),
      ...(data.desiredVibe ? { desiredVibe: data.desiredVibe } : {}),
      ...(data.usualSize ? { normallyWornTopSize: data.usualSize } : {}),
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
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  generate: async (id: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/generate`);
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  getResult: async (id: string): Promise<TryOnResult> => {
    const res = await apiClient.get(`/try-on/requests/${id}/result`);
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  getOutfitSuggestions: async (productIds: string[]): Promise<OutfitSuggestions> => {
    const res = await apiClient.post("/try-on/outfit-suggestions", { productIds });
    const data = unwrap(res) as OutfitSuggestions;
    return {
      ...data,
      suggestedItems: (data.suggestedItems ?? []).map((item) => ({
        ...item,
        imageUrl: resolveOptionalImageSrc(item.imageUrl),
      })),
    };
  },
  variantColor: async (id: string, color: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/color`, { color });
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  variantSize: async (id: string, size: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/size`, { size });
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  variantForm: async (id: string, form: string): Promise<TryOnResult> => {
    const res = await apiClient.post(`/try-on/requests/${id}/variants/form`, { form });
    return mapTryOnResult(unwrap(res) as RawTryOnResult);
  },
  save: async (id: string): Promise<void> => {
    await apiClient.post(`/try-on/requests/${id}/save`);
  },
  unsave: async (id: string): Promise<void> => {
    await apiClient.delete(`/try-on/requests/${id}/save`);
  },
  getSaved: async (): Promise<TryOnResult[]> => {
    try {
      const res = await apiClient.get("/try-on/saved");
      const data = unwrap(res) as RawTryOnResult[];
      return (Array.isArray(data) ? data : []).map((item) => mapTryOnResult(item));
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        return [];
      }
      throw error;
    }
  },
  feedback: async (id: string, rating: string, comment?: string): Promise<void> => {
    await apiClient.post(`/try-on/requests/${id}/feedback`, { rating, comment });
  },
};

export type { TryOnInputMode };
