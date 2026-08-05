import apiClient, { unwrap } from "./api-client";
import { resolveOptionalImageSrc } from "@/lib/media-url";
import type { RecommendationResult, StyleRecommendationOption } from "@/types/outfit";
import type { WardrobeMode } from "@/types/user";

interface BackendOutfitItem {
  productId?: string;
  wardrobeItemId?: string;
  role?: string;
  sourceType?: string;
  displayName: string;
  selectedSize?: string;
  selectedColor?: string;
  price?: number;
  imageUrl?: string;
}

interface BackendRecommendation {
  recommendationId: string;
  title: string;
  styleLabel?: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  confidence: string;
  stylistSource?: string;
  coherenceLabel?: string | null;
  outfitItems: BackendOutfitItem[];
  explanation?: {
    summary?: string;
    bodyFit?: string;
    styleFit?: string;
    occasionFit?: string;
    colorFit?: string;
    wardrobeFit?: string;
  };
}

interface BackendStyleOption {
  recommendationId: string;
  styleLabel: string;
  title: string;
  previewImageUrl?: string;
  itemCount: number;
  stylistSource?: string;
}

interface BackendChatResponse {
  conversationId?: string;
  requestId?: string;
  assistantMessage: {
    type: string;
    content: string;
    options?: BackendStyleOption[];
  };
  recommendations?: BackendRecommendation[];
}

function mapRecommendation(data: BackendRecommendation): RecommendationResult {
  return {
    id: data.recommendationId,
    title: data.title,
    styleLabel: data.styleLabel,
    recommendedSize: data.recommendedSize,
    alternativeSize: data.alternativeSize,
    recommendedForm: data.recommendedForm,
    recommendedColor: data.recommendedColor,
    confidence: data.confidence as RecommendationResult["confidence"],
    stylistSource: data.stylistSource as RecommendationResult["stylistSource"],
    coherenceLabel: data.coherenceLabel || null,
    outfitItems: (data.outfitItems || []).map((item, index) => ({
      id: item.productId || item.wardrobeItemId || `item-${index}`,
      productId: item.productId,
      wardrobeItemId: item.wardrobeItemId,
      name: item.displayName,
      category: item.role || "Item",
      color: item.selectedColor || "",
      size: item.selectedSize,
      price: item.price,
      fromWardrobe: item.sourceType === "USER_WARDROBE",
      imageUrl: resolveOptionalImageSrc(item.imageUrl),
    })),
    explanation: {
      summary: data.explanation?.summary,
      bodyFit: data.explanation?.bodyFit || "",
      styleFit: data.explanation?.styleFit || "",
      occasionFit: data.explanation?.occasionFit || "",
      colorFit: data.explanation?.colorFit || "",
      wardrobeUsage: data.explanation?.wardrobeFit,
    },
  };
}

function mapOptions(options?: BackendStyleOption[]): StyleRecommendationOption[] | undefined {
  if (!options) return undefined;
  return options.map((option) => ({
    recommendationId: option.recommendationId,
    styleLabel: option.styleLabel,
    title: option.title,
    previewImageUrl: resolveOptionalImageSrc(option.previewImageUrl) ?? undefined,
    itemCount: option.itemCount,
    stylistSource: option.stylistSource,
  }));
}

export interface SendStylistChatParams {
  message: string;
  conversationId?: string | null;
  history?: { role: string; content: string }[];
  selectedProductId?: string | null;
  wardrobeMode?: WardrobeMode;
}

export interface StylistChatApiResult {
  conversationId?: string;
  requestId?: string;
  type: "outfit_options" | "off_topic" | "text";
  content: string;
  options?: StyleRecommendationOption[];
  recommendations?: RecommendationResult[];
}

function mapChatResponse(
  data: BackendChatResponse,
  useOptionLabels = false,
): StylistChatApiResult {
  const type = (data.assistantMessage?.type || "text") as StylistChatApiResult["type"];
  const options = mapOptions(data.assistantMessage?.options);
  const recommendations = (data.recommendations || []).map((recommendation, index) => {
    const mapped = mapRecommendation(recommendation);
    if (useOptionLabels && options?.[index]?.styleLabel) {
      mapped.styleLabel = options[index].styleLabel;
    }
    return mapped;
  });
  return {
    conversationId: data.conversationId,
    requestId: data.requestId,
    type,
    content: data.assistantMessage?.content || "",
    options,
    recommendations,
  };
}

/**
 * Outfit generation calls Gemini per style, so it runs far past the default client
 * timeout on cold cloud instances. Starter builds three styles in one request.
 */
const CHAT_TIMEOUT_MS = 90_000;
const STARTER_TIMEOUT_MS = 180_000;

export const stylistChatApi = {
  sendMessage: async (params: SendStylistChatParams): Promise<StylistChatApiResult> => {
    const res = await apiClient.post(
      "/stylist/chat/messages",
      {
        message: params.message,
        conversationId: params.conversationId || undefined,
        history: params.history,
        selectedProductId: params.selectedProductId || undefined,
        wardrobeMode: params.wardrobeMode || "NO_WARDROBE_DATA",
      },
      { timeout: CHAT_TIMEOUT_MS },
    );
    const data = unwrap(res) as BackendChatResponse;
    return mapChatResponse(data);
  },

  getStarterOutfits: async (): Promise<StylistChatApiResult> => {
    const res = await apiClient.post("/stylist/chat/starter-outfits", undefined, {
      timeout: STARTER_TIMEOUT_MS,
    });
    return mapChatResponse(unwrap(res) as BackendChatResponse, true);
  },

  getConversation: async (id: string) => {
    const res = await apiClient.get(`/stylist/chat/conversations/${id}/messages`);
    return unwrap(res) as {
      id: string;
      title?: string;
      messages: {
        id: string;
        role: string;
        type: string;
        content: string;
        outfitRequestId?: string;
        createdAt: string;
      }[];
    };
  },
};
