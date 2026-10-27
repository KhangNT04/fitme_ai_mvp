"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Check, Coins, Share2 } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { PRIVACY_CONSENTS_QUERY_KEY, privacyApi } from "@/services/privacy-api";
import { rewardsApi } from "@/services/rewards-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { shareClaimSuccessMessage } from "@/lib/share-reward";

const MAX_TITLE = 200;
const MAX_CAPTION = 2000;

/**
 * Publishes a gallery image to the community and hands the user the public link.
 *
 * The title and caption are written here, before publishing, so the post is not just a bare
 * photo. After publishing, the user can share the link out or claim the Fitken reward for it
 * without leaving the gallery.
 */
export function CommunityShareButton({
  galleryImageId,
  brandNames,
  styleLabel,
}: {
  galleryImageId: string;
  brandNames?: string[];
  styleLabel?: string | null;
}) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");

  const consentsQuery = useQuery({
    queryKey: PRIVACY_CONSENTS_QUERY_KEY,
    queryFn: privacyApi.getConsents,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const { data: rewardsSummary } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: () => rewardsApi.getSummary(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

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
        galleryImageId,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      }),
    onSuccess: (result) => {
      setShareCode(result.post.shareCode);
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["community-posts", "mine"] });
      toast.success("Đã chia sẻ outfit lên cộng đồng!");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể chia sẻ outfit.")),
  });

  const claimMutation = useMutation({
    mutationFn: (postUrl: string) => rewardsApi.claimShare({ postUrl, galleryImageId }),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["fitken-ledger"] });
      toast.success(shareClaimSuccessMessage(claim.rewardGranted));
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Chưa ghi nhận được link chia sẻ.")),
  });

  const handleShare = async () => {
    const url = communityShareUrl(shareCode!);
    const shareCaption = communityShareCaption({ brandNames, styleLabel });
    const result = await shareCommunityPost({ url, title: "Outfit trên FitMe", text: shareCaption });
    if (result === "copied") {
      toast.success("Đã sao chép link. Dán vào bài đăng của bạn nhé!");
    } else if (result === "failed") {
      toast.error("Không thể chia sẻ. Hãy copy link thủ công.");
    }
  };

  if (!isAuthenticated) {
    return (
      <p className="text-xs text-muted-foreground">
        <Link href="/auth/login?redirect=/profile/gallery" className="underline">
          Đăng nhập
        </Link>{" "}
        để chia sẻ outfit lên cộng đồng.
      </p>
    );
  }

  if (shareCode) {
    const shareRemaining = rewardsSummary?.share.remainingToday ?? 0;
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Đã chia sẻ công khai
        </p>
        <Button size="sm" className="w-full rounded-full" onClick={() => void handleShare()}>
          <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Chia sẻ link
        </Button>
        {shareRemaining > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-full"
            disabled={claimMutation.isPending}
            onClick={() => claimMutation.mutate(communityShareUrl(shareCode))}
          >
            {claimMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Coins className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Nhận {rewardsSummary?.share.rewardAmount ?? 0} Fitken
          </Button>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">
            Bạn đã nhận thưởng chia sẻ hôm nay rồi.
          </p>
        )}
        <Link
          href={`/outfit/${shareCode}`}
          className="block text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Xem trang công khai
        </Link>
      </div>
    );
  }

  const needsConsent = consentsQuery.data?.COMMUNITY_SHARE !== true;

  if (needsConsent) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-400">
          Ảnh của bạn sẽ được chia sẻ công khai trên cộng đồng FitMe. Bạn có thể gỡ bất cứ lúc nào.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full"
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
    );
  }

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE))}
        maxLength={MAX_TITLE}
        placeholder="Tiêu đề (không bắt buộc)"
        aria-label="Tiêu đề bài đăng"
      />
      <textarea
        value={caption}
        onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
        maxLength={MAX_CAPTION}
        rows={2}
        placeholder="Mô tả outfit (không bắt buộc)"
        aria-label="Mô tả bài đăng"
        className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-full"
        disabled={publishMutation.isPending}
        onClick={() => publishMutation.mutate()}
      >
        {publishMutation.isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Globe className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        Chia sẻ lên cộng đồng
      </Button>
    </div>
  );
}
