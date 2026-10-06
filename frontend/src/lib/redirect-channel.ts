import { REDIRECT_CHANNELS, type RedirectChannel } from "@/types/redirect";

export const REDIRECT_CHANNEL_LABELS: Record<RedirectChannel, string> = {
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
  BRAND_WEBSITE: "Website chính hãng",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  OTHER: "Cửa hàng khác",
};

export function isRedirectChannel(value: unknown): value is RedirectChannel {
  return typeof value === "string" && (REDIRECT_CHANNELS as readonly string[]).includes(value);
}

/** Vietnamese label for a purchase channel; unknown or missing values read as a generic store. */
export function redirectChannelLabel(channel: string | null | undefined): string {
  return isRedirectChannel(channel) ? REDIRECT_CHANNEL_LABELS[channel] : REDIRECT_CHANNEL_LABELS.OTHER;
}
