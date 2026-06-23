import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format-price";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  showTryOn?: boolean;
}

export function ProductCard({ product, showTryOn = true }: ProductCardProps) {
  const imageUrl = product.images[0] || "/placeholder-product.svg";

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
          {product.aiTryOnEligible && (
            <Badge variant="secondary" className="absolute left-2 top-2">
              <Sparkles className="mr-1 h-3 w-3" />
              Thử AI
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <p className="text-xs text-stone-500">{product.brandName}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="mt-1 line-clamp-2 font-medium text-stone-900 hover:underline">
            {product.name}
          </h3>
        </Link>
        <p className="mt-2 font-semibold text-stone-900">{formatPrice(product.price)}</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/products/${product.id}`}>Xem</Link>
          </Button>
          {showTryOn && product.aiTryOnEligible && (
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/try-on?product=${product.id}`}>Thử AI</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
