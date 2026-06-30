"use client";

import Link from "next/link";
import { useState } from "react";
import { AppImage } from "@/components/common/AppImage";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format-price";
import { cn } from "@/lib/utils";
import { productDetailHref, type ConsumerNavContext } from "@/lib/nav-context";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  showTryOn?: boolean;
  /** Override product detail link (e.g. wardrobe hub). */
  href?: string;
  /** Optional badge over the product image. */
  imageBadge?: React.ReactNode;
  /** Hide price row (wardrobe / free items). */
  hidePrice?: boolean;
  /** Extra line under title (size, color). */
  meta?: string;
  /** default = detail grids; compact = dense picker; catalog = discover / editorial grid */
  size?: "default" | "compact" | "catalog";
  /** @deprecated use size="compact" */
  compact?: boolean;
  /** Controls product detail back link + bottom nav context */
  detailContext?: ConsumerNavContext;
}

const imageSizeClass: Record<"default" | "compact" | "catalog", string> = {
  default: "aspect-[3/4]",
  compact: "aspect-square sm:aspect-[4/5]",
  catalog: "aspect-square sm:aspect-[4/5]",
};

export function ProductCard({
  product,
  showTryOn = true,
  href,
  imageBadge,
  hidePrice = false,
  meta,
  size,
  compact = false,
  detailContext,
}: ProductCardProps) {
  const cardSize = size ?? (compact ? "compact" : "default");
  const productHref = href ?? productDetailHref(product.id, detailContext);
  const [hovered, setHovered] = useState(false);
  const imageUrl = product.images[0] || "/placeholder-product.svg";
  const hoverUrl = product.images[1] || imageUrl;
  const displayUrl = hovered && product.images.length > 1 ? hoverUrl : imageUrl;

  return (
    <Card
      className={cn(
        "product-card-luxe group overflow-hidden border-border/50 bg-white",
        (cardSize === "compact" || cardSize === "catalog") && "rounded-xl"
      )}
    >
      <Link href={productHref} className="block w-full">
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            imageSizeClass[cardSize]
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <AppImage
            src={displayUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes={
              cardSize === "catalog"
                ? "(max-width: 768px) 50vw, 33vw"
                : cardSize === "compact"
                  ? "(max-width: 768px) 50vw, 25vw"
                  : "(max-width: 768px) 100vw, 33vw"
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50" />
          {imageBadge}
          {product.aiTryOnEligible && !imageBadge && (
            <Badge
              variant="ai"
              className={cn(
                "absolute left-1.5 top-1.5 z-10 shadow-md",
                cardSize === "catalog" || cardSize === "compact"
                  ? "px-1.5 py-0 text-[9px] sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]"
                  : "text-[10px]"
              )}
            >
              <Sparkles className={cn("mr-0.5", cardSize === "catalog" || cardSize === "compact" ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3")} />
              Thử AI
            </Badge>
          )}
        </div>
      </Link>
      <CardContent
        className={cn(
          (cardSize === "compact" || cardSize === "catalog") && "p-2 sm:p-3",
          cardSize === "default" && "p-4"
        )}
      >
        <p
          className={cn(
            "truncate font-semibold uppercase tracking-wider text-muted-foreground",
            cardSize === "catalog" || cardSize === "compact" ? "text-[9px] sm:text-[10px]" : "text-[10px]"
          )}
        >
          {product.brandName}
        </p>
        <Link href={productHref}>
          <h3
            className={cn(
              "mt-0.5 font-display font-semibold leading-snug text-foreground transition-colors group-hover:text-primary",
              cardSize === "compact" && "line-clamp-1 text-xs sm:text-sm",
              cardSize === "catalog" && "line-clamp-1 text-xs sm:text-sm",
              cardSize === "default" && "mt-1 line-clamp-2 text-base"
            )}
          >
            {product.name}
          </h3>
        </Link>
        {meta && (
          <p className={cn(
            "text-muted-foreground",
            cardSize === "catalog" || cardSize === "compact" ? "mt-0.5 text-[10px] sm:text-xs" : "mt-1 text-xs",
          )}>
            {meta}
          </p>
        )}
        {!hidePrice && (
        <p
          className={cn(
            "font-display font-bold text-foreground",
            cardSize === "compact" && "mt-1 text-xs sm:text-sm",
            cardSize === "catalog" && "mt-0.5 text-xs sm:text-sm",
            cardSize === "default" && "mt-1.5 text-lg"
          )}
        >
          {formatPrice(product.price)}
        </p>
        )}
        <div
          className={cn(
            "flex gap-1.5 sm:gap-2",
            cardSize === "compact" && "mt-1.5 sm:mt-2",
            cardSize === "catalog" && "mt-1.5 sm:mt-2",
            cardSize === "default" && "mt-3"
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "flex-1",
              (cardSize === "compact" || cardSize === "catalog") &&
                "h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
            )}
            asChild
          >
            <Link href={productHref}>Xem</Link>
          </Button>
          {showTryOn && product.aiTryOnEligible && (
            <Button
              size="sm"
              variant="ai"
              className={cn(
                "btn-shimmer flex-1",
                (cardSize === "compact" || cardSize === "catalog") &&
                  "h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
              )}
              asChild
            >
              <Link href={`/try-on?product=${product.id}`}>Thử AI</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
