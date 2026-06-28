"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format-price";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  showTryOn?: boolean;
  /** default = detail grids; compact = dense picker; catalog = discover / editorial grid */
  size?: "default" | "compact" | "catalog";
  /** @deprecated use size="compact" */
  compact?: boolean;
}

const imageSizeClass: Record<"default" | "compact" | "catalog", string> = {
  default: "aspect-[3/4]",
  compact: "aspect-[4/5] max-h-[220px]",
  catalog:
    "h-[clamp(160px,22vh,240px)] sm:h-[clamp(170px,24vh,250px)] lg:h-[clamp(180px,26vh,260px)]",
};

export function ProductCard({
  product,
  showTryOn = true,
  size,
  compact = false,
}: ProductCardProps) {
  const cardSize = size ?? (compact ? "compact" : "default");
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
      <Link href={`/products/${product.id}`} className="block w-full">
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            imageSizeClass[cardSize]
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Image
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
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50" />
          {product.aiTryOnEligible && (
            <Badge variant="ai" className="absolute left-2 top-2 z-10 text-[10px] shadow-md">
              <Sparkles className="mr-0.5 h-3 w-3" />
              Thử AI
            </Badge>
          )}
        </div>
      </Link>
      <CardContent
        className={cn(
          cardSize === "compact" && "p-3",
          cardSize === "catalog" && "p-3",
          cardSize === "default" && "p-4"
        )}
      >
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {product.brandName}
        </p>
        <Link href={`/products/${product.id}`}>
          <h3
            className={cn(
              "mt-1 font-display font-semibold leading-snug text-foreground transition-colors group-hover:text-primary",
              cardSize === "compact" && "line-clamp-1 text-sm",
              cardSize === "catalog" && "line-clamp-1 text-sm",
              cardSize === "default" && "line-clamp-2 text-base"
            )}
          >
            {product.name}
          </h3>
        </Link>
        <p
          className={cn(
            "mt-1.5 font-display font-bold text-foreground",
            cardSize === "compact" && "text-base",
            cardSize === "catalog" && "mt-1 text-sm",
            cardSize === "default" && "text-lg"
          )}
        >
          {formatPrice(product.price)}
        </p>
        <div
          className={cn(
            "flex gap-2",
            cardSize === "compact" && "mt-2.5",
            cardSize === "catalog" && "mt-2",
            cardSize === "default" && "mt-3"
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "flex-1",
              cardSize === "compact" && "h-8 text-xs",
              cardSize === "catalog" && "h-8 text-xs"
            )}
            asChild
          >
            <Link href={`/products/${product.id}`}>Xem</Link>
          </Button>
          {showTryOn && product.aiTryOnEligible && (
            <Button
              size="sm"
              variant="ai"
              className={cn(
                "btn-shimmer flex-1",
                cardSize === "compact" && "h-8 text-xs",
                cardSize === "catalog" && "h-8 text-xs"
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
