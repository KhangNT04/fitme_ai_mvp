"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { productApi } from "@/services/product-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatPrice } from "@/utils/format-price";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useRouter } from "next/navigation";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { setSelectedProductId } = useConsultationStore();
  const { ensureSession } = useEnsureSession();

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id),
  });

  const handleConsult = async () => {
    await ensureSession();
    setSelectedProductId(id);
    router.push("/ai/body-profile");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <LoadingSkeleton type="detail" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const imageUrl = product.images[0] || "/placeholder-product.svg";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
          <Image src={imageUrl} alt={product.name} fill className="object-cover" unoptimized />
        </div>
        <div>
          <p className="text-sm text-stone-500">{product.brandName}</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold">{formatPrice(product.price)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>

          {product.description && (
            <p className="mt-6 text-stone-600">{product.description}</p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={handleConsult}>
              <Sparkles className="mr-2 h-4 w-4" />
              Tư vấn size & phối đồ bằng AI
            </Button>
            {product.aiTryOnEligible && (
              <Button variant="outline" asChild>
                <Link href={`/try-on?product=${product.id}`}>Thử mặc bằng AI</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/redirect/confirm/${product.id}`}>Mua ngay</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
