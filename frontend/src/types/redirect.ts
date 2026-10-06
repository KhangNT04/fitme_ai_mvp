export type RedirectChannel = "SHOPEE" | "TIKTOK_SHOP" | "WEBSITE" | "OTHER";
export const SOURCE_PAGES = ["AI_RESULT", "TRY_ON_RESULT", "PRODUCT_DETAIL", "PREVIEW"] as const;
export type SourcePage = (typeof SOURCE_PAGES)[number];

export interface BuyClickRequest {
  productId: string;
  recommendationId?: string | null;
  tryOnRequestId?: string | null;
  selectedSize?: string;
  selectedColor?: string;
  selectedForm?: string;
  sourcePage: SourcePage;
}

export interface BuyClickResponse {
  eventId: string;
  redirectUrl: string;
  channel: RedirectChannel;
}

export interface RedirectEvent {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedForm?: string;
  channel: RedirectChannel;
  redirectUrl: string;
}
