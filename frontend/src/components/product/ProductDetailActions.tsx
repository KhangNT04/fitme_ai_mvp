"use client";

import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirectConfirmHref } from "@/lib/redirect-href";
import { cn } from "@/lib/utils";

interface ProductDetailActionsProps {
  productId: string;
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
  aiTryOnEligible,
  onConsult,
  onTryOn,
  purchaseUrl,
  recommendationId,
  className,
}: ProductDetailActionsProps) {
  const buyHref = redirectConfirmHref(productId, { sourcePage: "PRODUCT_DETAIL", recommendationId });

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
    </div>
  );
}
