"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { galleryApi } from "@/services/gallery-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import {
  CommunityShareComposer,
  CommunityShareResult,
} from "@/components/community/CommunityShareComposer";
import { cn } from "@/lib/utils";

/**
 * Quick-share card for the community page.
 *
 * It lists the reader's own try-on photos and lets them write a title and caption before the
 * post goes live, so publishing is a real post rather than a bare image. After publishing, the
 * card shows the public link and the share/reward actions, so the flow never sends the user
 * somewhere else to finish.
 *
 * The card can be rendered on its own or inside the quick-share dialog — in the dialog the
 * surrounding title already names the flow, so the card header can be hidden to avoid
 * saying it twice.
 */
export function QuickShareCard({
  className,
  hideHeader = false,
}: {
  className?: string;
  /** Hide the "Chia sẻ nhanh" heading and hint when an outer element already shows them. */
  hideHeader?: boolean;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [published, setPublished] = useState<{ shareCode: string; shareUrl: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery-images", "quick-share"],
    queryFn: () => galleryApi.getImages(0, 12),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const images = data?.items ?? [];
  const selectedImage = images.find((item) => item.id === selectedId) ?? null;

  const header = hideHeader ? null : (
    <>
      <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        Chia sẻ nhanh
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Chọn ảnh thử mặc, thêm mô tả rồi đăng lên cộng đồng.
      </p>
    </>
  );

  if (!isAuthenticated) {
    return (
      <aside className={cn("surface-card rounded-2xl p-4", className)} aria-label="Chia sẻ nhanh">
        {header}
        <p className={cn("text-xs text-muted-foreground", !hideHeader && "mt-1")}>
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

  // Already published: show the public link and the share/reward actions instead of the picker.
  if (published) {
    return (
      <aside className={cn("surface-card rounded-2xl p-4", className)} aria-label="Chia sẻ nhanh">
        {header}
        <CommunityShareResult
          className="mt-3"
          shareCode={published.shareCode}
          shareUrl={published.shareUrl}
          galleryImageId={selectedImage?.id}
        />
        <Button
          size="sm"
          variant="ghost"
          className="mt-1.5 w-full rounded-full"
          onClick={() => {
            setPublished(null);
            setSelectedId(null);
          }}
        >
          Chia sẻ ảnh khác
        </Button>
      </aside>
    );
  }

  return (
    <aside className={cn("surface-card rounded-2xl p-4", className)} aria-label="Chia sẻ nhanh">
      {header}

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
      ) : selectedImage ? (
        <div className="mt-3">
          <CommunityShareComposer
            image={selectedImage}
            onPublished={(result) =>
              setPublished({ shareCode: result.shareCode, shareUrl: result.shareUrl })
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="mt-1.5 w-full rounded-full"
            onClick={() => setSelectedId(null)}
          >
            Chọn ảnh khác
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {images.map((image) => (
              <li key={image.id}>
                <button
                  type="button"
                  aria-label={`Chọn ảnh ${image.id}`}
                  onClick={() => setSelectedId(image.id)}
                  className="block w-full overflow-hidden rounded-xl border-2 border-transparent transition-colors hover:border-border"
                >
                  <IntrinsicImage
                    src={image.imageUrl}
                    alt="Ảnh thử mặc"
                    fallbackAspectRatio={3 / 4}
                    className="rounded-[0.6rem]"
                  />
                </button>
              </li>
            ))}
          </ul>

          <Button size="sm" className="mt-3 w-full rounded-full" disabled>
            <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Chọn ảnh để đăng
          </Button>

          <Button asChild size="sm" variant="ghost" className="mt-1.5 w-full rounded-full">
            <Link href="/profile/gallery">Mở thư viện ảnh</Link>
          </Button>
        </>
      )}
    </aside>
  );
}
