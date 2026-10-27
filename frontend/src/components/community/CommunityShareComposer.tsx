"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Coins, Globe, Loader2, Share2, Sparkles } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { PRIVACY_CONSENTS_QUERY_KEY, privacyApi } from "@/services/privacy-api";
import { rewardsApi } from "@/services/rewards-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { shareClaimSuccessMessage } from "@/lib/share-reward";
import { cn } from "@/lib/utils";
import type { GalleryImageDto } from "@/types";

const MAX_TITLE = 200;
const MAX_CAPTION = 2000;

/**
 * The full publishing flow for one try-on photo: write a title and a caption, publish it to
 * the community, then share the public link — optionally to claim the Fitken reward.
 *
 * The reward is offered right here instead of sending the user to another page: the link that
 * was just published is the one they want to share, so the whole flow stays in one dialog.
 */
export function CommunityShareComposer({
  image,
  onPublished,
  className,
}: {
  image: GalleryImageDto;
  /** Called with the published post so the caller can show the result. */
  onPublished?: (result: { shareCode: string; shareUrl: string; title: string | null; caption: string | null }) => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");

  const consentsQuery = useQuery({
    queryKey: PRIVACY_CONSENTS_QUERY_KEY,
    queryFn: privacyApi.getConsents,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const hasConsent = consentsQuery.data?.COMMUNITY_SHARE === true;

  const consentMutation = useMutation({
    mutationFn: (accepted: boolean) => privacyApi.recordConsent("COMMUNITY_SHARE", accepted),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRIVACY_CONSENTS_QUERY_KEY });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể lưu quyền riêng tư.")),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      communityApi.createPost({
        galleryImageId: image.id,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["community-posts", "mine"] });
      toast.success("Đã chia sẻ outfit lên cộng đồng!");
      onPublished?.({
        shareCode: result.post.shareCode,
        shareUrl: result.shareUrl,
        title: result.post.title ?? null,
        caption: result.post.caption ?? null,
      });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể chia sẻ outfit.")),
  });

  const busy = publishMutation.isPending || consentMutation.isPending;

  if (!isAuthenticated) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login?redirect=/community" className="underline">
            Đăng nhập
          </Link>{" "}
          để chia sẻ outfit lên cộng đồng.
        </p>
        <Button asChild size="sm" variant="outline" className="w-full rounded-full">
          <Link href="/try-on">Thử đồ AI</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* The photo being published — the user must see what they are about to share. */}
      <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
        <IntrinsicImage
          src={image.imageUrl}
          alt="Ảnh sẽ chia sẻ"
          fallbackAspectRatio={3 / 4}
          className="w-20 shrink-0 overflow-hidden rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Chia sẻ ảnh này lên cộng đồng</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ảnh thử mặc của bạn sẽ hiện công khai với tên hiển thị, không kèm email.
          </p>
        </div>
      </div>

      {!hasConsent ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
          <p className="text-sm font-medium text-amber-900">Cho phép chia sẻ công khai</p>
          <p className="mt-0.5 text-xs text-amber-800/80">
            Ảnh của bạn sẽ được chia sẻ công khai trên cộng đồng FitMe. Bạn có thể gỡ bất cứ lúc nào.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 w-full rounded-full"
            disabled={consentMutation.isPending}
            onClick={() => consentMutation.mutate(true)}
          >
            {consentMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Globe className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Cho phép chia sẻ
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs font-medium text-foreground">Tiêu đề (không bắt buộc)</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE))}
                maxLength={MAX_TITLE}
                placeholder="Ví dụ: Outfit đi học mùa thu"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">Mô tả (không bắt buộc)</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
                maxLength={MAX_CAPTION}
                rows={3}
                placeholder="Kể một chút về outfit này để mọi người dễ hình dung nhé…"
                className="mt-1 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                {caption.length}/{MAX_CAPTION}
              </span>
            </label>
          </div>

          <Button
            size="sm"
            className="w-full rounded-full"
            disabled={busy}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {publishMutation.isPending ? "Đang đăng..." : "Đăng lên cộng đồng"}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Shown after the post is live: the public link plus the two ways to take it further —
 * share it out, or claim the Fitken reward for it.
 */
export function CommunityShareResult({
  shareCode,
  shareUrl,
  galleryImageId,
  className,
}: {
  shareCode: string;
  shareUrl: string;
  galleryImageId?: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const absoluteUrl = communityShareUrl(shareCode);

  const { data: summary } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: () => rewardsApi.getSummary(),
    staleTime: 30_000,
  });

  const claimMutation = useMutation({
    mutationFn: () => rewardsApi.claimShare({ postUrl: absoluteUrl, galleryImageId }),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-ledger"] });
      toast.success(shareClaimSuccessMessage(claim.rewardGranted));
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Chưa ghi nhận được link chia sẻ.")),
  });

  const handleShare = async () => {
    const result = await shareCommunityPost({
      url: absoluteUrl,
      title: "Outfit trên FitMe",
      text: communityShareCaption({}),
    });
    if (result === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Đã sao chép link. Dán vào bài đăng của bạn nhé!");
    } else if (result === "failed") {
      toast.error("Không thể chia sẻ. Hãy copy link thủ công.");
    }
  };

  const canClaim = (summary?.share.remainingToday ?? 0) > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-900">
          <Check className="h-4 w-4" aria-hidden="true" />
          Đã chia sẻ công khai
        </p>
        <Link
          href={shareUrl.startsWith("http") ? shareUrl : `/outfit/${shareCode}`}
          className="mt-1 block truncate text-xs text-emerald-800/80 underline underline-offset-2"
        >
          {absoluteUrl}
        </Link>
      </div>

      <div className="space-y-2">
        <Button size="sm" variant="outline" className="w-full rounded-full" onClick={() => void handleShare()}>
          {copied ? (
            <Check className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Đã sao chép link" : "Chia sẻ link đi"}
        </Button>

        {canClaim ? (
          <Button
            size="sm"
            variant="ghost"
            className="w-full rounded-full"
            disabled={claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
          >
            {claimMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Coins className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Nhận {summary?.share.rewardAmount ?? 0} Fitken
          </Button>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">
            Bạn đã nhận thưởng chia sẻ hôm nay rồi. Hãy quay lại vào ngày mai nhé!
          </p>
        )}
      </div>
    </div>
  );
}
