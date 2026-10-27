"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Share2, Trash2, Image as ImageIcon, ExternalLink, Sparkles, Coins } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { galleryApi, nextGalleryPage } from "@/services/gallery-api";
import { CommunityShareButton } from "@/components/community/CommunityShareButton";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { useShareRewardAmount } from "@/hooks/use-share-reward-amount";
import { GalleryImageDto } from "@/types";

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
  return response.blob();
}

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default function GalleryPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<GalleryImageDto | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const shareReward = useShareRewardAmount();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["gallery-images"],
    queryFn: ({ pageParam }) => galleryApi.getImages(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextGalleryPage,
    enabled: isAuthenticated,
  });
  const images = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[data.pages.length - 1]?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => galleryApi.deleteImage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
      toast.success("Đã xóa ảnh khỏi thư viện.");
      setIsLightboxOpen(false);
    },
    onError: () => toast.error("Không thể xóa ảnh."),
  });

  const handleShare = async (image: GalleryImageDto) => {
    try {
      const blob = await fetchImageBlob(image.imageUrl);
      const file = new File([blob], `fitme-tryon-${image.id}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "FitMe AI Try-on",
          text: "Xem outfit AI phối cho mình trên FitMe nè!",
        });
        return;
      }
      saveBlob(blob, file.name);
      toast.success("Đã tải ảnh về. Đăng ảnh lên trang cá nhân rồi dán link ở trang Nhận thưởng nhé!");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Không thể chia sẻ ảnh.");
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      saveBlob(await fetchImageBlob(imageUrl), `fitme-tryon-${Date.now()}.jpg`);
    } catch {
      toast.error("Không thể tải ảnh xuống.");
    }
  };

  const requestDelete = (image: GalleryImageDto) => {
    if (window.confirm("Bạn có chắc muốn xóa ảnh này?")) {
      deleteMutation.mutate(image.id);
    }
  };

  if (!isAuthenticated) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <CollapsingPageHeader title="Thư viện ảnh" backHref="/profile" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-2">Đăng nhập để xem thư viện</h2>
          <Button asChild className="rounded-full mt-4">
            <Link href="/auth/login?redirect=/profile/gallery">Đăng nhập ngay</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Thư viện ảnh"
        subtitle="Ảnh thử mặc AI của bạn — mở ảnh để xem chi tiết, chia sẻ hoặc đăng lên cộng đồng."
        backHref="/profile"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !images.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Thư viện của bạn đang trống.</p>
          <Button asChild variant="outline" className="rounded-full mt-4">
            <Link href="/try-on">Thử đồ AI ngay</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 mt-4">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow hover:shadow-md"
                onClick={() => {
                  setSelectedImage(img);
                  setIsLightboxOpen(true);
                }}
              >
                <IntrinsicImage
                  src={img.imageUrl}
                  alt="Ảnh thử mặc"
                  fallbackAspectRatio={3 / 4}
                  showErrorHint
                  imgClassName="transition-transform duration-300 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Xem chi tiết
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Đang hiển thị {images.length}/{Math.max(total, images.length)} ảnh
            </p>
            {hasNextPage && (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? "Đang tải..." : "Xem thêm"}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Lightbox — light theme so it matches the rest of the app. */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl overflow-hidden p-0 sm:max-w-5xl">
          {selectedImage && (
            <div className="flex max-h-[88vh] flex-col md:flex-row">
              {/* Photo */}
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-3 sm:p-4">
                <IntrinsicImage
                  src={selectedImage.imageUrl}
                  alt="Chi tiết ảnh thử mặc"
                  fallbackAspectRatio={3 / 4}
                  showErrorHint
                  className="h-[46vh] w-full rounded-xl bg-transparent md:h-[68vh]"
                  imgClassName="object-contain"
                />

                {/* Quick actions — always reachable on touch. */}
                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Tải ảnh xuống"
                    className="rounded-full bg-card/90 text-foreground shadow-sm hover:bg-card"
                    onClick={() => void handleDownload(selectedImage.imageUrl)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Chia sẻ ảnh"
                    className="rounded-full bg-card/90 text-foreground shadow-sm hover:bg-card"
                    onClick={() => void handleShare(selectedImage)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Xóa ảnh"
                    className="rounded-full bg-card/90 text-destructive shadow-sm hover:bg-card"
                    onClick={() => requestDelete(selectedImage)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="flex w-full flex-col gap-4 overflow-y-auto border-t border-border/60 bg-card p-4 sm:p-5 md:w-80 md:border-l md:border-t-0">
                <div>
                  <DialogTitle className="text-base">Ảnh thử mặc</DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    Tạo ngày {formatDateTime(selectedImage.createdAt)}
                  </DialogDescription>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Coins className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-900">Nhận {shareReward} Fitken</p>
                      <p className="mt-0.5 text-xs text-amber-800/80">
                        Chia sẻ ảnh này lên MXH và dán link để nhận thưởng.
                      </p>
                      <Button asChild size="sm" className="mt-2.5 w-full rounded-full">
                        <Link href={`/rewards?galleryImageId=${selectedImage.id}`}>
                          Dán link nhận thưởng
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    Chia sẻ lên cộng đồng
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Đăng công khai outfit này để người khác tham khảo.
                  </p>
                  <div className="mt-2.5">
                    <CommunityShareButton
                      galleryImageId={selectedImage.id}
                      brandNames={selectedImage.products?.map((prod) => prod.name).slice(0, 3)}
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sản phẩm trong ảnh
                  </h3>
                  {selectedImage.products && selectedImage.products.length > 0 ? (
                    <ul className="space-y-1.5">
                      {selectedImage.products.map((prod) => (
                        <li key={prod.productId}>
                          <Link
                            href={`/products/${prod.productId}`}
                            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="h-12 w-12 shrink-0 rounded-lg bg-muted object-cover"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {prod.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {prod.price.toLocaleString()}đ
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có thông tin sản phẩm.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
