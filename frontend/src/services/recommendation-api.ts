import apiClient, { unwrap } from "./api-client";
import type {
  CreateRecommendationRequest,
  RecommendationResult,
  OutfitItem,
} from "@/types/outfit";
import type { Product } from "@/types/product";

interface BackendOutfitItem {
  productId?: string;
  wardrobeItemId?: string;
  role?: string;
  sourceType?: string;
  displayName: string;
  selectedSize?: string;
  selectedColor?: string;
  price?: number;
  canBuy?: boolean;
}

interface BackendRecommendation {
  recommendationId: string;
  title: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  confidence: string;
  outfitItems: BackendOutfitItem[];
  explanation?: {
    bodyFit?: string;
    styleFit?: string;
    occasionFit?: string;
    colorFit?: string;
    wardrobeFit?: string;
  };
  preview?: {
    type?: string;
    imageUrl?: string;
    disclaimer?: string;
  };
}

function mapOutfitItem(item: BackendOutfitItem, index: number): OutfitItem {
  return {
    id: item.productId || item.wardrobeItemId || `item-${index}`,
    productId: item.productId,
    wardrobeItemId: item.wardrobeItemId,
    name: item.displayName,
    category: item.role || "Item",
    color: item.selectedColor || "",
    size: item.selectedSize,
    price: item.price,
    fromWardrobe: item.sourceType === "USER_WARDROBE",
  };
}

function mapRecommendation(data: BackendRecommendation): RecommendationResult {
  return {
    id: data.recommendationId,
    title: data.title,
    recommendedSize: data.recommendedSize,
    alternativeSize: data.alternativeSize,
    recommendedForm: data.recommendedForm,
    recommendedColor: data.recommendedColor,
    confidence: data.confidence as RecommendationResult["confidence"],
    outfitItems: (data.outfitItems || []).map(mapOutfitItem),
    explanation: {
      bodyFit: data.explanation?.bodyFit || "",
      styleFit: data.explanation?.styleFit || "",
      occasionFit: data.explanation?.occasionFit || "",
      colorFit: data.explanation?.colorFit || "",
      wardrobeUsage: data.explanation?.wardrobeFit,
    },
    preview: data.preview
      ? {
          type: (data.preview.type || "OUTFIT_BOARD") as "OUTFIT_BOARD" | "AVATAR" | "USER_PHOTO_2D",
          imageUrl: data.preview.imageUrl,
          disclaimer: data.preview.disclaimer || "",
        }
      : undefined,
  };
}

function mapSimilarProduct(item: BackendOutfitItem): Product {
  return {
    id: item.productId || "",
    brandId: "",
    brandName: "",
    name: item.displayName,
    category: "",
    price: item.price ?? 0,
    images: [],
    colors: [],
    sizes: [],
    fitType: "REGULAR",
    styleTags: [],
    occasionTags: [],
    purchaseUrl: "",
    stockStatus: "IN_STOCK",
    status: "ACTIVE",
    aiTryOnEligible: false,
  };
}

export const recommendationApi = {
  create: async (data: CreateRecommendationRequest): Promise<RecommendationResult> => {
    const res = await apiClient.post("/recommendations", data);
    return mapRecommendation(unwrap(res));
  },
  getById: async (id: string): Promise<RecommendationResult> => {
    const res = await apiClient.get(`/recommendations/${id}`);
    return mapRecommendation(unwrap(res));
  },
  save: async (id: string): Promise<void> => {
    await apiClient.post(`/recommendations/${id}/save`);
  },
  feedback: async (id: string, rating: string, comment?: string): Promise<void> => {
    await apiClient.post(`/recommendations/${id}/feedback`, { rating, comment });
  },
  getSimilarProducts: async (id: string): Promise<Product[]> => {
    const res = await apiClient.get(`/recommendations/${id}/similar-products`);
    const items = unwrap(res) as BackendOutfitItem[];
    return items.map(mapSimilarProduct);
  },
  getSaved: async (): Promise<RecommendationResult[]> => {
    const res = await apiClient.get("/recommendations/saved");
    const list = unwrap(res) as BackendRecommendation[];
    return list.map(mapRecommendation);
  },
};
