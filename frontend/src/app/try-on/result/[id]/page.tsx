"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Palette, Ruler, Shirt } from "lucide-react";
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

      {data.previewType && (
        <Badge className="mb-4" variant="secondary">
          {PREVIEW_TYPE_LABELS[data.previewType] ?? "Preview"}
        </Badge>
      )}

      {data.previewSource && (
        <Badge className="mb-4 ml-2" variant={data.previewSource === "VTON" ? "ai" : "warning"}>
          {PREVIEW_SOURCE_LABELS[data.previewSource] ?? data.previewSource}
        </Badge>
      )}

      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        {data.previewImageUrl ? (
          <Image src={data.previewImageUrl} alt="Try-on preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/70">
            {PREVIEW_PLACEHOLDERS[data.previewType ?? "OUTFIT_BOARD"]}
          </div>
        )}
      </div>

      {data.disclaimer && (
        <p className="mt-4 text-sm text-muted-foreground">{data.disclaimer}</p>
      )}

      {data.errorMessage && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          {data.errorMessage}
        </p>
      )}

      <Disclaimer className="mt-6" />

      <div className="mt-6 flex flex-wrap gap-2">
        {data.recommendedSize && <Badge>Gợi ý size: {data.recommendedSize}</Badge>}
        {data.recommendedForm && <Badge variant="secondary">Form: {data.recommendedForm}</Badge>}
        {data.recommendedColor && <Badge variant="outline">Màu: {data.recommendedColor}</Badge>}
      </div>

      {(data.improvementSuggestions?.length || data.suggestedItems?.length) ? (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Gợi ý hoàn thiện set</CardTitle></CardHeader>
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

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" asChild><Link href={`/try-on/color/${id}`}><Palette className="mr-2 h-4 w-4" />Thử màu khác</Link></Button>
        <Button variant="outline" asChild><Link href={`/try-on/size/${id}`}><Ruler className="mr-2 h-4 w-4" />Thử size khác</Link></Button>
        <Button variant="outline" asChild><Link href={`/try-on/form/${id}`}><Shirt className="mr-2 h-4 w-4" />Thử form khác</Link></Button>
        <Button
          onClick={async () => {
            try {
              await tryonApi.save(id);
              await queryClient.invalidateQueries({ queryKey: ["saved-tryons"] });
              toast.success("Đã lưu kết quả thử mặc");
              await refetch();
            } catch {
              toast.error("Lưu kết quả thất bại");
            }
          }}
          disabled={data.saved}
        >
          <Save className="mr-2 h-4 w-4" />
          {data.saved ? "Đã lưu" : "Lưu kết quả"}
        </Button>
      </div>

      <Button className="mt-4 w-full" asChild>
        <Link href={`/try-on/decision/${id}`}>Quyết định tiếp theo</Link>
      </Button>
    </PageShell>
  );
}
