"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Palette, Ruler } from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { isFromSavedList, resolveSavedResultBack } from "@/lib/nav-context";
import type { TryOnPreviewType } from "@/types/tryon";
import { toast } from "@/stores/toast-store";
import { TryOnOutfitSuggestions } from "@/components/tryon/TryOnOutfitSuggestions";
import { useShareRewardAmount } from "@/hooks/use-share-reward-amount";

const PREVIEW_TYPE_LABELS: Record<TryOnPreviewType, string> = {
  OUTFIT_BOARD: "Outfit board",
  AVATAR: "Avatar mẫu",
  USER_PHOTO_2D: "Ảnh của bạn",
};

const PREVIEW_PLACEHOLDERS: Record<TryOnPreviewType, string> = {
  OUTFIT_BOARD: "Preview outfit board",
  AVATAR: "Preview avatar mẫu",
  USER_PHOTO_2D: "Preview trên ảnh của bạn",
};

const PREVIEW_SOURCE_LABELS: Record<string, string> = {
  VTON: "Ảnh thử mặc AI",
  OUTFIT_BOARD: "Minh họa outfit board",
  AVATAR: "AI ghép outfit lên avatar mẫu",
  USER_PHOTO: "Minh họa trên ảnh của bạn",
  FALLBACK: "Minh họa sản phẩm (VTON chưa khả dụng)",
};

export default function TryOnResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const resultBack = resolveSavedResultBack("tryon", isFromSavedList(searchParams));
  const shareReward = useShareRewardAmount();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tryon-result", id],
    queryFn: () => tryonApi.getResult(id),
  });

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
        title="Kết quả thử mặc AI"
        showAiBadge
        backHref={resultBack.href}
        backLabel={resultBack.label}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {data.previewType && (
          <Badge variant="secondary">
            {PREVIEW_TYPE_LABELS[data.previewType] ?? "Preview"}
          </Badge>
        )}
        {data.previewSource && (
          <Badge variant={data.previewSource === "VTON" ? "ai" : "warning"}>
            {PREVIEW_SOURCE_LABELS[data.previewSource] ?? data.previewSource}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[300px] space-y-3 lg:mx-0">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-muted">
            {data.previewImageUrl ? (
              <Image
                src={data.previewImageUrl}
                alt="Try-on preview"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground/70">
                {PREVIEW_PLACEHOLDERS[data.previewType ?? "OUTFIT_BOARD"]}
              </div>
            )}
          </div>

          {data.disclaimer && (
            <p className="text-xs leading-relaxed text-muted-foreground">{data.disclaimer}</p>
          )}

          {data.errorMessage && (
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              {data.errorMessage}
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {data.recommendedSize && <Badge>Gợi ý size: {data.recommendedSize}</Badge>}
            {data.recommendedForm && <Badge variant="secondary">Form: {data.recommendedForm}</Badge>}
            {data.recommendedColor && <Badge variant="outline">Màu: {data.recommendedColor}</Badge>}
          </div>

          {data.items.some((item) => item.selectedSize || item.selectedColor) && (
            <ul className="space-y-1 text-sm">
              {data.items.map((item) => (
                <li key={item.productId} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name || item.category}</span>
                  {item.selectedSize && <Badge variant="outline">Size {item.selectedSize}</Badge>}
                  {item.selectedColor && <Badge variant="outline">Màu {item.selectedColor}</Badge>}
                </li>
              ))}
            </ul>
          )}

          {(data.improvementSuggestions?.length || data.suggestedItems?.length) ? (
            <Card>
              <CardHeader className="pb-3">
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
                  compact
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Set đồ hiện tại đã cân đối — bạn có thể thử màu hoặc size khác bằng các nút bên dưới.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Disclaimer className="mt-6" />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Button variant="outline" asChild><Link href={`/try-on/color/${id}`}><Palette className="mr-2 h-4 w-4" />Thử màu khác</Link></Button>
        <Button variant="outline" asChild><Link href={`/try-on/size/${id}`}><Ruler className="mr-2 h-4 w-4" />Thử size khác</Link></Button>
        <Button
          onClick={async () => {
            try {
              await tryonApi.save(id);
              await queryClient.invalidateQueries({ queryKey: ["saved-tryons"] });
              await queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
              toast.success("Đã lưu vào thư viện ảnh");
              await refetch();
            } catch {
              toast.error("Lưu kết quả thất bại");
            }
          }}
          disabled={data.saved}
        >
          <Save className="mr-2 h-4 w-4" />
          {data.saved ? "Đã lưu vào thư viện" : "Lưu vào thư viện"}
        </Button>
      </div>

      {data.saved && (
        <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-400">Nhận {shareReward} Fitken miễn phí!</p>
            <p className="text-sm text-amber-700 dark:text-amber-500">Chia sẻ ảnh này lên mạng xã hội để nhận thưởng.</p>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href="/profile/gallery">Đến thư viện để chia sẻ</Link>
          </Button>
        </div>
      )}

      <Button className="mt-4 w-full" asChild>
        <Link href={`/try-on/decision/${id}`}>Quyết định tiếp theo</Link>
      </Button>
    </PageShell>
  );
}
