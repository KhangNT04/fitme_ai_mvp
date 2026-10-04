"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { ProductThumb } from "@/components/commerce/ProductThumb";
import { cartItemVariantLabel } from "@/lib/commerce-utils";
import { formatPrice } from "@/utils/format-price";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types/commerce";

interface CartLineItemProps {
  item: CartItem;
  busy?: boolean;
  onQuantityChange: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
}

export function CartLineItem({ item, busy, onQuantityChange, onRemove }: CartLineItemProps) {
  const soldOut = item.stockQuantity <= 0;
  const insufficient = !soldOut && item.quantity > item.stockQuantity;
  const label = cartItemVariantLabel(item);

  return (
    <li
      className={cn("flex gap-3 py-4", !item.available && "opacity-90")}
      data-testid="cart-item"
      aria-busy={busy}
    >
      <ProductThumb src={item.imageUrl} alt={item.name} href={`/products/${item.productId}`} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${item.productId}`} className="line-clamp-2 text-sm font-medium hover:underline">
              {item.name}
            </Link>
            {label && <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={busy}
            aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {!item.available && (
          <p className="text-xs font-medium text-red-600" role="status">
            {soldOut
              ? "Sản phẩm đã hết hàng — vui lòng xóa khỏi giỏ để thanh toán."
              : insufficient
                ? `Chỉ còn ${item.stockQuantity} sản phẩm — hãy giảm số lượng.`
                : "Sản phẩm hiện không còn bán."}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={Math.max(item.stockQuantity, item.quantity)}
            disabled={busy || soldOut}
            onChange={(next) => onQuantityChange(item, next)}
          />
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{formatPrice(item.lineTotalVnd)}</p>
            {item.quantity > 1 && (
              <p className="text-[11px] text-muted-foreground">{formatPrice(item.unitPriceVnd)} / sản phẩm</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
