"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Share2, Trash2, Image as ImageIcon, ExternalLink, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { galleryApi, nextGalleryPage } from "@/services/gallery-api";
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
      <CollapsingPageHeader title="Thư viện ảnh" backHref="/profile" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mt-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-muted cursor-pointer"
                onClick={() => {
                  setSelectedImage(img);
                  setIsLightboxOpen(true);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt="Try-on"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Xem chi tiết</span>
                </div>
              </div>
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

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none text-white sm:rounded-2xl">
          {selectedImage && (
            <div className="flex flex-col md:flex-row h-[85vh] md:h-[80vh]">
              {/* Image Section */}
              <div className="relative flex-1 flex items-center justify-center p-4 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.imageUrl}
                  alt="Try-on detail"
                  className="max-h-full max-w-full object-contain"
                />
                
                {/* Action Overlay Mobile */}
                <div className="absolute top-4 right-4 flex gap-2 md:hidden">
                  <Button size="icon" variant="secondary" className="rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => handleDownload(selectedImage.imageUrl)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => handleShare(selectedImage)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="rounded-full bg-black/50 text-white hover:bg-red-600" onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa ảnh này?")) deleteMutation.mutate(selectedImage.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sidebar Section */}
              <div className="w-full md:w-80 bg-zinc-900 p-5 flex flex-col overflow-y-auto">
                <div className="hidden md:flex justify-end gap-2 mb-6">
                  <Button size="icon" variant="ghost" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleDownload(selectedImage.imageUrl)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleShare(selectedImage)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-full text-zinc-400 hover:text-red-400 hover:bg-zinc-800" onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa ảnh này?")) deleteMutation.mutate(selectedImage.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400 mb-1">Nhận {shareReward} Fitken</p>
                      <p className="text-xs text-zinc-400 mb-3">Chia sẻ ảnh này lên MXH và dán link để nhận thưởng.</p>
                      <Button asChild size="sm" className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-black">
                        <Link href={`/rewards?galleryImageId=${selectedImage.id}`}>
                          Dán link nhận thưởng
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Sản phẩm trong ảnh</h3>
                <div className="space-y-3 flex-1">
                  {selectedImage.products?.map((prod) => (
                    <Link key={prod.productId} href={`/products/${prod.productId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-md object-cover bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{prod.name}</p>
                        <p className="text-xs text-zinc-500">{prod.price.toLocaleString()}đ</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-zinc-600" />
                    </Link>
                  ))}
                  {(!selectedImage.products || selectedImage.products.length === 0) && (
                    <p className="text-sm text-zinc-500">Không có thông tin sản phẩm.</p>
                  )}
                </div>
                
                <p className="text-xs text-zinc-600 mt-6 text-center">
                  Tạo ngày {formatDateTime(selectedImage.createdAt)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
