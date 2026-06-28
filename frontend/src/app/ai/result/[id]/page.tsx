"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Save, Camera, ShoppingBag, Sparkles } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { formatPrice } from "@/utils/format-price";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";

export default function AiResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => recommendationApi.getById(id),
  });

  if (isLoading) {
    return (
      <PageShell width="wide">
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell width="wide">
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHeader steps={AI_FLOW_STEPS} currentStep={4} title={data.title} showAiBadge backHref="/discover" backLabel="Khám phá sản phẩm" />

      <div className="flex flex-wrap gap-2">
        {data.recommendedSize && <Badge>Gợi ý size: {data.recommendedSize}</Badge>}
        {data.recommendedForm && <Badge variant="secondary">Form: {data.recommendedForm}</Badge>}
        {data.recommendedColor && <Badge variant="outline">Màu: {data.recommendedColor}</Badge>}
        <Badge variant={data.confidence === "HIGH" ? "success" : "warning"}>
          Độ tin cậy: {data.confidence}
        </Badge>
      </div>

      {data.preview?.imageUrl && (
        <div className="mt-6 relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          <Image src={data.preview.imageUrl} alt="Preview outfit" fill className="object-cover" unoptimized />
        </div>
      )}

      <Disclaimer className="mt-6" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {data.outfitItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex gap-4 p-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.imageUrl || "/placeholder-product.svg"}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <h3 className="font-medium">{item.name}</h3>
                    {item.size && <p className="text-sm text-muted-foreground">Size: {item.size}</p>}
                  </div>
                  {item.fromWardrobe && <Badge variant="success">Bạn đã có</Badge>}
                </div>
                {item.price && <p className="mt-1 font-semibold">{formatPrice(item.price)}</p>}
                {!item.fromWardrobe && item.productId && (
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link href={`/redirect/confirm/${item.productId}`}>Mua ngay</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Giải thích AI</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong>Phù hợp dáng:</strong> {data.explanation.bodyFit}</p>
          <p><strong>Phù hợp gu:</strong> {data.explanation.styleFit}</p>
          <p><strong>Phù hợp hoàn cảnh:</strong> {data.explanation.occasionFit}</p>
          <p><strong>Gợi ý màu:</strong> {data.explanation.colorFit}</p>
          {data.explanation.wardrobeUsage && (
            <p><strong>Tủ đồ:</strong> {data.explanation.wardrobeUsage}</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => recommendationApi.save(id)}>
          <Save className="mr-2 h-4 w-4" />Lưu gợi ý
        </Button>
        <Button variant="ai" asChild>
          <Link href={`/ai/photo-upload?recommendation=${id}`}>
            <Camera className="mr-2 h-4 w-4" />Upload ảnh tạo preview 2D
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/similar-products?recommendation=${id}`}>
            <Sparkles className="mr-2 h-4 w-4" />Sản phẩm tương tự
          </Link>
        </Button>
        <Button variant="ai" asChild>
          <Link href={`/ai/variants/${id}`}>
            <ShoppingBag className="mr-2 h-4 w-4" />Thử biến thể
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
