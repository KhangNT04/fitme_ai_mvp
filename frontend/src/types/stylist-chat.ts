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
  compactOutfits?: boolean;
}

export const STYLIST_QUICK_PROMPTS = [
  "Đi làm văn phòng — thanh lịch nhưng không cứng",
  "Đi chơi cafe cuối tuần, thoải mái có điểm nhấn",
  "Đi tập / thể thao, năng động cả ngày",
  "Hẹn hò buổi tối, muốn nổi bật tinh tế",
  "Về quê vài ngày, dễ mặc và thoải mái",
  "Mix với tủ đang có, ít mua thêm",
] as const;

export const STYLIST_WELCOME =
  "Bạn muốn mình phối đồ thêm theo hướng nào?";

export const STYLIST_STARTER_FOLLOW_UP =
  "Còn cần chỉnh gì không? Gõ dịp mặc hoặc yêu cầu bên dưới — ví dụ “đi cafe, nhẹ nhàng” hoặc “họp sáng, lịch sự”. Mình sẽ phối thêm ngay trong khung chat.";

export const STYLIST_STARTER_PENDING_KEY = "fitme-starter-outfits-pending";

export const STYLIST_COMPOSER_PLACEHOLDER =
  "VD: Đi làm fresher, thanh lịch nhưng vẫn năng động...";
