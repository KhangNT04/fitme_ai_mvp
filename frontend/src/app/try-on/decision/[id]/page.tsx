"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppImage } from "@/components/common/AppImage";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { TRY_ON_ROLE_LABELS, mapCategoryToRole, type TryOnItemRole } from "@/lib/tryon-role";
import { formatPrice } from "@/utils/format-price";
import type { TryOnItem } from "@/types/tryon";
import { TryOnOutfitSuggestions } from "@/components/tryon/TryOnOutfitSuggestions";
import { useEnrichedTryOnItems } from "@/hooks/use-enriched-tryon-items";

function itemRoleLabel(item: TryOnItem): string {
  if (item.role && item.role in TRY_ON_ROLE_LABELS) {
    return TRY_ON_ROLE_LABELS[item.role as TryOnItemRole];
  }
  return TRY_ON_ROLE_LABELS[mapCategoryToRole(item.category)];
}

function displaySize(item: TryOnItem): string {
  return item.selectedSize ?? item.suggestedSize ?? item.size ?? "—";
}

function displayColor(item: TryOnItem): string | undefined {
  return item.selectedColor ?? item.color;
}

function DecisionItemCard({ item }: { item: TryOnItem }) {
  const size = displaySize(item);
  const color = displayColor(item);
  const canBuy = item.canBuy !== false;

  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          <AppImage
            src={item.imageUrl}
            alt={item.name || "Sản phẩm"}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{itemRoleLabel(item)}</p>
          <p className="font-medium leading-snug">{item.name || "Sản phẩm"}</p>
          {item.category && (
            <p className="mt-0.5 text-sm text-muted-foreground">{item.category}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Size gợi ý: {size}</Badge>
            {color && <Badge variant="outline">Màu: {color}</Badge>}
            {item.price != null && (
              <Badge variant="outline">{formatPrice(item.price)}</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 self-center">
          {canBuy ? (
            <Button size="sm" asChild>
              <Link href={`/redirect/confirm/${item.productId}`}>
                <ShoppingBag className="mr-1 h-4 w-4" />
                Mua
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Không bán
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/products/${item.productId}`}>
              <ExternalLink className="mr-1 h-4 w-4" />
              Chi tiết
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TryOnDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tryon-result", id],
    queryFn: () => tryonApi.getResult(id),
  });

  const { items: outfitItems } = useEnrichedTryOnItems(data?.items ?? []);

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={3}
        title="Quyết định tiếp theo"
        subtitle="Bạn muốn làm gì với kết quả thử mặc?"
        backHref={`/try-on/result/${id}`}
        backLabel="Kết quả thử mặc"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
            {data.previewImageUrl ? (
              <Image
                src={data.previewImageUrl}
                alt="Preview thử mặc"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preview outfit
              </div>
            )}
          </div>
          {data.disclaimer && (
            <p className="mt-3 text-xs text-muted-foreground">{data.disclaimer}</p>
          )}
        </div>

        <div>
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Sản phẩm trong outfit</h2>
            {outfitItems.length > 0 ? (
              outfitItems.map((item) => (
                <DecisionItemCard key={item.productId} item={item} />
              ))
            ) : (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Không có sản phẩm nào trong kết quả thử mặc.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {(data.improvementSuggestions?.length || data.suggestedItems?.length) ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Gợi ý hoàn thiện set</CardTitle>
          </CardHeader>
          <CardContent>
            <TryOnOutfitSuggestions
              suggestions={{
                outfitComplete: data.outfitComplete ?? false,
                missingRoles: [],
                improvementSuggestions: data.improvementSuggestions ?? [],
                suggestedItems: data.suggestedItems ?? [],
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Button className="mt-8 w-full" variant="secondary" asChild>
        <Link href={`/try-on/result/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Xem lại kết quả
        </Link>
      </Button>
    </PageShell>
  );
}
