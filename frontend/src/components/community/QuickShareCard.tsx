"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Upload } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { galleryApi } from "@/services/gallery-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";

/**
 * Quick-share card for the community page.
 *
 * It lists the reader's own try-on photos and publishes the picked one straight to the
 * community, so sharing does not require a trip through the gallery. The card lives in
 * the right-hand column of the community layout.
 */
export function QuickShareCard({ className }: { className?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery-images", "quick-share"],
    queryFn: () => galleryApi.getImages(0, 12),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const images = data?.items ?? [];

  const publishMutation = useMutation({
    mutationFn: (galleryImageId: string) => communityApi.createPost({ galleryImageId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      setSelectedId(null);
      toast.success("Đã chia sẻ outfit lên cộng đồng!");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể chia sẻ outfit.")),
  });

  if (!isAuthenticated) {
    return (
      <aside className={cn("surface-card rounded-2xl p-4", className)} aria-label="Chia sẻ nhanh">
        <p className="font-display text-sm font-semibold text-foreground">Chia sẻ nhanh</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <Link href="/auth/login?redirect=/community" className="underline">
            Đăng nhập
          </Link>{" "}
          để đăng ảnh thử mặc của bạn lên cộng đồng.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3 w-full rounded-full">
          <Link href="/try-on">Thử đồ AI</Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside className={cn("surface-card rounded-2xl p-4", className)} aria-label="Chia sẻ nhanh">
      <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        Chia sẻ nhanh
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Chọn ảnh thử mặc để đăng ngay lên cộng đồng.
      </p>

      {isLoading ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Bạn chưa có ảnh thử mặc nào để chia sẻ.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2.5 rounded-full">
            <Link href="/try-on">Thử đồ ngay</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {images.map((image) => {
              const active = selectedId === image.id;
              return (
                <li key={image.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`Chọn ảnh ${image.id}`}
                    onClick={() => setSelectedId(active ? null : image.id)}
                    className={cn(
                      "block w-full overflow-hidden rounded-xl border-2 transition-colors",
                      active ? "border-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    <IntrinsicImage
                      src={image.imageUrl}
                      alt="Ảnh thử mặc"
                      fallbackAspectRatio={3 / 4}
                      className="rounded-[0.6rem]"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            size="sm"
            className="mt-3 w-full rounded-full"
            disabled={!selectedId || publishMutation.isPending}
            onClick={() => {
              if (selectedId) publishMutation.mutate(selectedId);
            }}
          >
            {publishMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : selectedId ? (
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {publishMutation.isPending
              ? "Đang đăng..."
              : selectedId
                ? "Đăng lên cộng đồng"
                : "Chọn ảnh để đăng"}
          </Button>

          <Button asChild size="sm" variant="ghost" className="mt-1.5 w-full rounded-full">
            <Link href="/profile/gallery">Mở thư viện ảnh</Link>
          </Button>
        </>
      )}
    </aside>
  );
}
