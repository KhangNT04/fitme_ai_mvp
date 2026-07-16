import type { RecommendationResult, StyleRecommendationOption } from "@/types/outfit";

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageType = "text" | "outfit_options" | "off_topic";

export interface StylistChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string;
  createdAt: number;
  requestId?: string;
  options?: StyleRecommendationOption[];
  recommendations?: RecommendationResult[];
  conversationId?: string;
}

export const STYLIST_QUICK_PROMPTS = [
  "Mình là nghệ sĩ đường phố, muốn outfit streetwear thoải mái đi cafe cuối tuần",
  "Đi làm văn phòng — thanh lịch nhưng không cứng",
  "Weekend chill, phong cách minimal basic dễ mặc",
  "Hẹn hò buổi tối, muốn nổi bật tinh tế",
  "Đi du lịch vài ngày, thoải mái và dễ mix",
  "Tập gym / sporty, năng động cả ngày",
] as const;

export const STYLIST_WELCOME =
  "Bạn muốn tôi phối đồ cho bạn như thế nào?";

export const STYLIST_COMPOSER_PLACEHOLDER =
  "VD: Mình là nghệ sĩ đường phố, muốn outfit streetwear thoải mái đi cafe cuối tuần...";
