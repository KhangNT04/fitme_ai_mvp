"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Bookmark, Share2, ExternalLink, Sparkles, Users } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { AppImage } from "@/components/common/AppImage";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { DEMO_COMMUNITY_POSTS } from "@/lib/demo-community-data";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

export default function CommunityOutfitPage() {
  const params = useParams<{ shareCode: string }>();
  const shareCode = params?.shareCode ?? "";
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["community-post", shareCode],
    queryFn: () => communityApi.getByShareCode(shareCode),
    enabled: !!shareCode,
  });

  // Interaction state lives in the query cache so it never drifts from the server response.
  const liked = data?.likedByMe ?? false;
  const saved = data?.savedByMe ?? false;
  const likeCount = data?.likeCount ?? 0;
  const isDemoPost = DEMO_COMMUNITY_POSTS.some((post) => post.shareCode === shareCode);

  const likeMutation = useMutation({
    mutationFn: (next: boolean) => communityApi.setLike(data!.id, next),
    onSuccess: (result) => {
      queryClient.setQueryData(["community-post", shareCode], (prev: typeof data) =>
        prev ? { ...prev, likedByMe: result.likedByMe, likeCount: result.likeCount } : prev,
      );
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể thích bài đăng.")),
  });

  const saveMutation = useMutation({
    mutationFn: (next: boolean) => communityApi.setSave(data!.id, next),
    onSuccess: (result) => {
      queryClient.setQueryData(["community-post", shareCode], (prev: typeof data) =>
        prev ? { ...prev, savedByMe: result.savedByMe } : prev,
      );
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể lưu bài đăng.")),
  });

  const handleShare = async () => {
    if (!data) return;
    const url = communityShareUrl(data.shareCode);
    const caption = communityShareCaption({
      brandNames: data.brandNames,
      styleLabel: data.styleLabel,
    });
    const result = await shareCommunityPost({ url, title: "Outfit trên FitMe", text: caption });
    if (result === "copied") {
      toast.success("Đã sao chép link. Dán vào bài đăng của bạn nhé!");
    } else if (result === "failed") {
      toast.error("Không thể chia sẻ. Hãy copy link thủ công.");
    }
  };

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
        <ErrorState onRetry={() => void refetch()} />
        <div className="mt-4 text-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/discover">Khám phá sản phẩm</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted">
          <AppImage src={data.imageUrl} alt="Outfit chia sẻ" fill className="object-cover" unoptimized />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="surface-card space-y-3 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {data.authorInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{data.authorDisplayName}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(data.createdAt)}</p>
              </div>
              {isDemoPost && (
                <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400">
                  Dữ liệu demo
                </Badge>
              )}
            </div>

            {data.title && <h1 className="font-display text-lg font-bold text-foreground">{data.title}</h1>}
            {data.caption && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{data.caption}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {data.brandNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
              {data.styleLabel && <Badge variant="outline">{data.styleLabel}</Badge>}
              {data.occasion && <Badge variant="outline">{data.occasion}</Badge>}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant={liked ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                disabled={!isAuthenticated || likeMutation.isPending}
                onClick={() => likeMutation.mutate(!liked)}
                aria-pressed={liked}
              >
                <Heart className={cn("mr-1.5 h-4 w-4", liked && "fill-current")} aria-hidden="true" />
                {likeCount}
              </Button>
              <Button
                variant={saved ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                disabled={!isAuthenticated || saveMutation.isPending}
                onClick={() => saveMutation.mutate(!saved)}
                aria-pressed={saved}
              >
                <Bookmark className={cn("mr-1.5 h-4 w-4", saved && "fill-current")} aria-hidden="true" />
                Lưu
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => void handleShare()}>
                <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Chia sẻ
              </Button>
              <span className="text-xs text-muted-foreground">{data.viewCount} lượt xem</span>
            </div>

            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                <Link href={`/auth/login?redirect=/outfit/${data.shareCode}`} className="underline">
                  Đăng nhập
                </Link>{" "}
                để thích và lưu outfit này.
              </p>
            )}
          </div>

          {data.products.length > 0 && (
            <div className="surface-card rounded-2xl p-4 sm:p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
                Sản phẩm trong outfit
              </h2>
              <ul className="space-y-2">
                {data.products.map((product) => (
                  <li key={product.productId}>
                    <Link
                      href={`/products/${product.productId}`}
                      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <AppImage src={product.imageUrl} alt={product.name} fill className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                        {product.price != null && (
                          <span className="block text-xs text-muted-foreground">
                            {product.price.toLocaleString("vi-VN")}đ
                          </span>
                        )}
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="surface-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Muốn phối đồ như thế này?</p>
                <p className="text-xs text-muted-foreground">
                  Tư vấn AI chọn outfit theo số đo và gu của bạn trong 30 giây.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" className="rounded-full">
                <Link href="/ai/start">Tư vấn AI</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/community">
                  <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Cộng đồng
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
