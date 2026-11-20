"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirectConfirmHref } from "@/lib/redirect-href";
import { shopChatApi } from "@/services/shop-chat-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";

interface ProductDetailActionsProps {
  productId: string;
  brandId?: string;
  aiTryOnEligible?: boolean;
  onConsult: () => void;
  onTryOn?: () => void;
  /** Product page on the brand's store; the buy button is hidden when it is missing. */
  purchaseUrl?: string;
  /** Loaded recommendation this product was opened from, attributed on the buy click. */
  recommendationId?: string;
  className?: string;
}

export function ProductDetailActions({
  productId,
  brandId,
  aiTryOnEligible,
  onConsult,
  onTryOn,
  purchaseUrl,
  recommendationId,
  className,
}: ProductDetailActionsProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [messaging, setMessaging] = useState(false);
  const buyHref = redirectConfirmHref(productId, { sourcePage: "PRODUCT_DETAIL", recommendationId });

  const messageShop = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }
    setMessaging(true);
    try {
      const detail = await shopChatApi.open({
        productId,
        brandId,
        firstMessage: undefined,
      });
      router.push(`/messages?thread=${detail.thread.id}`);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Không mở được chat với shop"));
    } finally {
      setMessaging(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-3">
        {purchaseUrl ? (
          <Button asChild data-testid="buy-at-store">
            <Link href={buyHref}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Mua tại cửa hàng gốc
            </Link>
          </Button>
        ) : null}
        <Button variant="ai" onClick={onConsult}>
          <Sparkles className="mr-2 h-4 w-4" />
          Tư vấn size & phối đồ bằng AI
        </Button>
        <Button variant="outline" onClick={() => void messageShop()} disabled={messaging}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Nhắn shop
        </Button>
        {aiTryOnEligible && onTryOn ? (
          <Button variant="outline" onClick={onTryOn}>
            Thử mặc bằng AI
          </Button>
        ) : aiTryOnEligible ? (
          <Button variant="outline" asChild>
            <Link href={`/try-on?product=${productId}`}>Thử mặc bằng AI</Link>
          </Button>
        ) : null}
      </div>
      {aiTryOnEligible === false && (
        <p className="text-xs text-muted-foreground" data-testid="try-on-unavailable">
          Sản phẩm này chưa hỗ trợ thử mặc bằng AI vì chưa có ảnh thử đồ phù hợp (giày, phụ kiện hoặc ảnh sản phẩm
          chưa đủ rõ).
        </p>
      )}
    </div>
  );
}
