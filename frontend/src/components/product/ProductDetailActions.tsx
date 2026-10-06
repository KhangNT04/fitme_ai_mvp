"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { VariantPicker } from "@/components/commerce/VariantPicker";
import { buildLoginHref, isUserLoggedIn } from "@/hooks/use-require-login";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { redirectConfirmHref } from "@/lib/redirect-href";
import {
  findVariant,
  isVariantInStock,
  pickInitialVariant,
  resolveSelection,
  stockHint,
  type VariantSelection,
} from "@/lib/variant-selection";
import { clampQuantity } from "@/lib/commerce-utils";
import { cartApi, CART_QUERY_KEY } from "@/services/cart-api";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/product";

interface ProductDetailActionsProps {
  productId: string;
  aiTryOnEligible?: boolean;
  onConsult: () => void;
  onTryOn?: () => void;
  /** In-app purchase: product can be added to cart / bought now. */
  purchasable?: boolean;
  variants?: ProductVariant[];
  /** External shop link — secondary option when the product is purchasable in-app. */
  purchaseUrl?: string;
  /** Loaded recommendation this product was opened from, attributed on the buy click. */
  recommendationId?: string;
  className?: string;
}

function PurchasePanel({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const router = useRouter();
  const pathname = usePathname() ?? `/products/${productId}`;
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initial = useMemo(() => pickInitialVariant(variants), [variants]);
  const [selection, setSelection] = useState<VariantSelection>({
    color: initial?.colorName,
    size: initial?.sizeLabel,
  });
  const [quantity, setQuantity] = useState(1);

  const variant = findVariant(variants, selection.color, selection.size);
  const inStock = isVariantInStock(variant);
  const stock = variant?.stockQuantity ?? 0;
  const hint = stockHint(variant);
  const safeQuantity = clampQuantity(quantity, stock);

  const add = useMutation({
    mutationFn: () => {
      if (!variant) throw new Error("Vui lòng chọn phân loại");
      return cartApi.addItem({ productId, variantId: variant.id, quantity: safeQuantity });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });

  const ensureLogin = (): boolean => {
    if (isUserLoggedIn()) return true;
    const query = searchParams?.toString();
    router.push(buildLoginHref(query ? `${pathname}?${query}` : pathname));
    return false;
  };

  const handleAdd = () => {
    if (!ensureLogin() || !variant) return;
    add.mutate(undefined, {
      onSuccess: () => toast.success("Đã thêm vào giỏ hàng"),
      onError: (e) => toast.error(getCommerceErrorMessage(e, "Không thể thêm vào giỏ hàng")),
    });
  };

  const handleBuyNow = () => {
    if (!ensureLogin() || !variant) return;
    add.mutate(undefined, {
      onSuccess: () => router.push("/checkout"),
      onError: (e) => toast.error(getCommerceErrorMessage(e, "Không thể mua ngay")),
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4" data-testid="purchase-panel">
      <VariantPicker
        variants={variants}
        color={selection.color}
        size={selection.size}
        onColorChange={(color) => {
          setSelection((cur) => resolveSelection(variants, { color }, cur));
          setQuantity(1);
        }}
        onSizeChange={(size) => {
          setSelection((cur) => resolveSelection(variants, { size }, cur));
          setQuantity(1);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={safeQuantity}
          max={stock}
          disabled={!inStock || add.isPending}
          onChange={setQuantity}
        />
        {hint && (
          <span className={cn("text-sm", inStock ? "text-amber-700" : "font-medium text-red-600")}>{hint}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!inStock || !variant || add.isPending}
          onClick={handleAdd}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {add.isPending ? "Đang thêm..." : "Thêm vào giỏ"}
        </Button>
        <Button type="button" disabled={!inStock || !variant || add.isPending} onClick={handleBuyNow}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Mua ngay
        </Button>
      </div>
      {!inStock && variant && (
        <p className="text-sm text-red-600">Phân loại này đã hết hàng. Vui lòng chọn màu / size khác.</p>
      )}
    </div>
  );
}

export function ProductDetailActions({
  productId,
  aiTryOnEligible,
  onConsult,
  onTryOn,
  purchasable,
  variants,
  purchaseUrl,
  recommendationId,
  className,
}: ProductDetailActionsProps) {
  const hasInAppPurchase = !!purchasable && !!variants && variants.length > 0;
  const buyHref = redirectConfirmHref(productId, { sourcePage: "PRODUCT_DETAIL", recommendationId });
  const allSoldOut = hasInAppPurchase && variants.every((v) => v.stockQuantity <= 0);

  return (
    <div className={cn("space-y-4", className)}>
      {hasInAppPurchase && <PurchasePanel productId={productId} variants={variants} />}
      {allSoldOut && <p className="text-sm font-medium text-red-600">Sản phẩm tạm hết hàng.</p>}

      <div className="flex flex-wrap gap-3">
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
        {hasInAppPurchase ? (
          purchaseUrl ? (
            <Button variant="ghost" asChild>
              <Link href={buyHref}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Mua tại cửa hàng gốc
              </Link>
            </Button>
          ) : null
        ) : (
          <Button variant="outline" asChild>
            <Link href={buyHref}>Mua ngay</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
