"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Share2, Loader2, Check } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { PRIVACY_CONSENTS_QUERY_KEY, privacyApi } from "@/services/privacy-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
import { getUserErrorMessage } from "@/lib/user-error-message";

/**
 * Publishes a gallery image to the community and hands the user the public link.
 * The consent is requested in-place the first time, so no extra settings trip is needed.
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

  const consentsQuery = useQuery({
    queryKey: PRIVACY_CONSENTS_QUERY_KEY,
    queryFn: privacyApi.getConsents,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const consentMutation = useMutation({
    mutationFn: (accepted: boolean) => privacyApi.recordConsent("COMMUNITY_SHARE", accepted),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRIVACY_CONSENTS_QUERY_KEY });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => communityApi.createPost({ galleryImageId }),
    onSuccess: (result) => {
      setShareCode(result.post.shareCode);
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Đã chia sẻ outfit lên cộng đồng!");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể chia sẻ outfit.")),
  });

  const handleShare = async () => {
    const url = communityShareUrl(shareCode!);
    const caption = communityShareCaption({ brandNames, styleLabel });
    const result = await shareCommunityPost({ url, title: "Outfit trên FitMe", text: caption });
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
  );
}
