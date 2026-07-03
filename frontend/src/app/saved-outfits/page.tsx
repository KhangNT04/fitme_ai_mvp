"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { tryonApi } from "@/services/tryon-api";
import type { ApiError } from "@/services/api-client";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { linkAnonymousSession } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import {
  hasApiRequestIdentity,
  useConsumerStoresReady,
} from "@/hooks/use-consumer-stores-ready";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import type { RecommendationResult } from "@/types/outfit";
import type { TryOnPreviewType, TryOnResult } from "@/types/tryon";

type SavedTab = "outfits" | "tryons";

type PendingDelete =
  | { type: "outfits"; id: string; title: string }
  | { type: "tryons"; id: string; title: string }
  | null;

const TABS: { value: SavedTab; label: string }[] = [
  { value: "outfits", label: "Gợi ý outfit" },
  { value: "tryons", label: "Kết quả thử mặc" },
];

const PREVIEW_TYPE_LABELS: Record<TryOnPreviewType, string> = {
  OUTFIT_BOARD: "Outfit board",
  AVATAR: "Avatar mẫu",
  USER_PHOTO_2D: "Ảnh của bạn",
};

function outfitThumbnail(item: RecommendationResult): string | undefined {
  return item.preview?.imageUrl ?? item.outfitItems.find((i) => i.imageUrl)?.imageUrl;
}

function tryOnThumbnail(item: TryOnResult): string | undefined {
  return item.previewImageUrl ?? item.items?.find((i) => i.imageUrl)?.imageUrl;
}

function SavedThumbnail({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
          Chưa có ảnh
        </div>
      )}
    </div>
  );
}

export default function SavedOutfitsPage() {
  const queryClient = useQueryClient();
  const storesReady = useConsumerStoresReady();
  const { ensureSession } = useEnsureSession();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [identityReady, setIdentityReady] = useState(false);
  const [tab, setTab] = useState<SavedTab>("outfits");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  useEffect(() => {
    if (!storesReady) return;

    let cancelled = false;

    (async () => {
      if (!hasApiRequestIdentity()) {
        await ensureSession();
      }
      if (isAuthenticated) {
        await linkAnonymousSession();
      }
      if (!cancelled) {
        setIdentityReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storesReady, ensureSession, isAuthenticated]);

  const outfitsQuery = useQuery({
    queryKey: ["saved-outfits"],
    queryFn: () => recommendationApi.getSaved(),
    enabled: identityReady,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const tryOnsQuery = useQuery({
    queryKey: ["saved-tryons"],
    queryFn: () => tryonApi.getSaved(),
    enabled: identityReady,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const deleteOutfitMutation = useMutation({
    mutationFn: (id: string) => recommendationApi.unsave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
      toast.success("Đã xóa khỏi danh sách đã lưu");
      setPendingDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getUserErrorMessage(error, "Không xóa được. Vui lòng thử lại."));
    },
  });

  const deleteTryOnMutation = useMutation({
    mutationFn: (id: string) => tryonApi.unsave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-tryons"] });
      toast.success("Đã xóa khỏi danh sách đã lưu");
      setPendingDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getUserErrorMessage(error, "Không xóa được. Vui lòng thử lại."));
    },
  });

  const deleting =
    deleteOutfitMutation.isPending || deleteTryOnMutation.isPending;

  const showLoading =
    !identityReady ||
    outfitsQuery.isLoading ||
    tryOnsQuery.isLoading ||
    ((outfitsQuery.isFetching || tryOnsQuery.isFetching) &&
      outfitsQuery.data === undefined &&
      tryOnsQuery.data === undefined);

  const outfitsError = outfitsQuery.error;
  const tryOnsError = tryOnsQuery.error;
  const outfits = outfitsQuery.data ?? [];
  const tryOns = tryOnsQuery.data ?? [];
  const bothFailed = !!outfitsError && !!tryOnsError;

  const refetchAll = () => {
    outfitsQuery.refetch();
    tryOnsQuery.refetch();
  };

  const tabSubtitle =
    tab === "outfits"
      ? "Các set outfit đã lưu từ luồng tư vấn AI"
      : "Preview thử mặc AI đã lưu";

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "outfits") {
      deleteOutfitMutation.mutate(pendingDelete.id);
      return;
    }
    deleteTryOnMutation.mutate(pendingDelete.id);
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Đã lưu"
        subtitle="Outfit từ tư vấn AI và kết quả thử mặc"
        backHref="/"
        backLabel="Trang chủ"
      />

      <div className="space-y-6">
        {!showLoading && !bothFailed && (
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <Chip
                key={item.value}
                selected={tab === item.value}
                onClick={() => setTab(item.value)}
              >
                {item.label}
              </Chip>
            ))}
          </div>
        )}

        {showLoading && <LoadingSkeleton type="list" />}

        {!showLoading && bothFailed && (
          <ErrorState
            message={(outfitsError as ApiError).message}
            onRetry={refetchAll}
          />
        )}

        {!showLoading && !bothFailed && tab === "outfits" && (
          <section>
            <p className="text-sm text-muted-foreground">{tabSubtitle}</p>
            {outfitsError ? (
              <div className="mt-4">
                <ErrorState
                  message={(outfitsError as ApiError).message}
                  onRetry={() => outfitsQuery.refetch()}
                />
              </div>
            ) : outfits.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Chưa có gợi ý outfit"
                  description="Lưu outfit từ kết quả tư vấn AI để xem lại sau."
                  actionLabel="Bắt đầu tư vấn"
                  actionHref="/ai/start"
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {outfits.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                      <SavedThumbnail src={outfitThumbnail(item)} alt={item.title} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.outfitItems.length} món trong set
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/ai/result/${item.id}?from=saved`}>Xem</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            setPendingDelete({
                              type: "outfits",
                              id: item.id,
                              title: item.title,
                            })
                          }
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {!showLoading && !bothFailed && tab === "tryons" && (
          <section>
            <p className="text-sm text-muted-foreground">{tabSubtitle}</p>
            {tryOnsError ? (
              <div className="mt-4">
                <ErrorState
                  message={(tryOnsError as ApiError).message}
                  onRetry={() => tryOnsQuery.refetch()}
                />
              </div>
            ) : tryOns.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Chưa có kết quả thử mặc"
                  description="Lưu kết quả từ trang thử mặc AI để xem lại sau."
                  actionLabel="Thử mặc AI"
                  actionHref="/try-on"
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {tryOns.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                      <SavedThumbnail src={tryOnThumbnail(item)} alt="Kết quả thử mặc" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">Kết quả thử mặc</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.items?.length ?? 0} món đã thử
                          {item.previewType
                            ? ` · ${PREVIEW_TYPE_LABELS[item.previewType]}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/try-on/result/${item.id}?from=saved`}>Xem</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            setPendingDelete({
                              type: "tryons",
                              id: item.id,
                              title: "Kết quả thử mặc",
                            })
                          }
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Xóa khỏi danh sách đã lưu?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" sẽ bị gỡ khỏi Đã lưu. Kết quả vẫn còn trong lịch sử tư vấn hoặc thử mặc nếu bạn cần xem lại.`
            : ""
        }
        confirmLabel="Xóa"
        cancelLabel="Giữ lại"
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  );
}
