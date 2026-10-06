"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewApi } from "@/services/review-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { fitkenCapMessage } from "@/lib/fitken-cap";
import { cn } from "@/lib/utils";
import type { ProductReviewsResponse, ReviewItemDto } from "@/types";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export function ProductReviewsSection({ productId }: { productId: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(0);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", productId, page],
    queryFn: () => reviewApi.getProductReviews(productId, page, 5),
  });

  const submitMutation = useMutation({
    mutationFn: () => reviewApi.createReview(productId, { rating, content, imageUrls: images }),
    onSuccess: (res) => {
      const capMessage = res ? fitkenCapMessage(res) : null;
      if (capMessage) {
        toast.success(`Đánh giá đã được gửi! ${capMessage}.`);
        void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      } else if (res?.rewardGranted > 0) {
        toast.success(`Đánh giá đã được gửi! Bạn nhận +${res.rewardGranted} Fitken.`);
        void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      } else if (res?.rewardLimitReached) {
        toast.success("Đánh giá đã được gửi! Hôm nay bạn đã nhận thưởng đánh giá, quay lại vào ngày mai nhé.");
      } else {
        toast.success("Đánh giá của bạn đã được gửi!");
      }
      setContent("");
      setImages([]);
      setRating(5);
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không thể gửi đánh giá.")),
  });

  const helpfulMutation = useMutation({
    mutationFn: ({ reviewId, helpful }: { reviewId: string; helpful: boolean }) =>
      reviewApi.setHelpful(reviewId, helpful),
    onSuccess: (vote) => {
      queryClient.setQueryData<ProductReviewsResponse>(["product-reviews", productId, page], (prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === vote.reviewId
                  ? { ...item, helpfulCount: vote.helpfulCount, helpfulByMe: vote.helpfulByMe }
                  : item,
              ),
            }
          : prev,
      );
    },
    onError: (e) => toast.error(getUserErrorMessage(e, "Không thể ghi nhận bình chọn.")),
  });

  const handleHelpful = (review: ReviewItemDto) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/products/${productId}`);
      return;
    }
    helpfulMutation.mutate({ reviewId: review.id, helpful: !review.helpfulByMe });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (images.length + files.length > 5) {
      toast.error("Tối đa 5 ảnh cho mỗi đánh giá.");
      return;
    }

    setIsUploading(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const res = await reviewApi.uploadImage(files[i]);
        if (res.url) newImages.push(res.url);
      }
      setImages(newImages);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Lỗi tải ảnh lên."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Đánh giá sản phẩm</h2>
        {data && data.totalCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <span className="font-semibold text-lg">{data.averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground text-sm">({data.totalCount} đánh giá)</span>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">Bạn đã mua sản phẩm này?</h3>
            <p className="text-sm text-muted-foreground">Chia sẻ cảm nhận của bạn để giúp người khác nhé.</p>
            <p className="text-xs text-amber-600 font-medium mt-1">+2 Fitken khi đánh giá có kèm ảnh (1 lần/ngày)!</p>
          </div>
          {isAuthenticated ? (
            <Button onClick={() => setShowForm(true)} className="rounded-full shrink-0">
              Viết đánh giá
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-full shrink-0">
              <Link href={`/auth/login?redirect=/products/${productId}`}>Đăng nhập để đánh giá</Link>
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <div className="mb-8 p-5 bg-card rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Viết đánh giá của bạn</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Chất lượng sản phẩm</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={cn("h-8 w-8", star <= rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Nội dung đánh giá</p>
            <textarea
              placeholder="Sản phẩm có tốt không? Form dáng thế nào? (Tối thiểu 20 ký tự)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-y w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className={cn("text-xs mt-1 text-right", content.length < 20 ? "text-destructive" : "text-muted-foreground")}>
              {content.length}/2000 ký tự
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Hình ảnh (Tối đa 5 ảnh)</p>
            <div className="flex flex-wrap gap-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative h-20 w-20 rounded-md overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Review" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border hover:bg-muted/50 transition-colors">
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Thêm ảnh</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              )}
            </div>
            {isUploading && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Đang tải ảnh lên...</p>}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={content.length < 20 || isUploading || submitMutation.isPending}
              className="rounded-full px-8"
            >
              Gửi đánh giá
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Chưa có đánh giá nào cho sản phẩm này.
        </div>
      ) : (
        <div className="space-y-6">
          {data?.items.map((review) => (
            <div key={review.id} className="border-b border-border/50 pb-6 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                    {review.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.authorName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(review.createdAt)}</span>
                      {review.verifiedPurchase && (
                        <span className="flex items-center text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Đã mua hàng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-current" : "text-muted")} />
                  ))}
                </div>
              </div>
              
              <p className="text-sm mt-3 whitespace-pre-wrap">{review.content}</p>
              
              {review.imageUrls && review.imageUrls.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {review.imageUrls.map((url, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={url} alt="Review" className="h-24 w-24 object-cover rounded-md border shrink-0" />
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {review.mine ? (
                  review.helpfulCount > 0 && <span>{review.helpfulCount} người thấy hữu ích</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleHelpful(review)}
                    disabled={helpfulMutation.isPending && helpfulMutation.variables?.reviewId === review.id}
                    aria-pressed={review.helpfulByMe}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors disabled:opacity-60",
                      review.helpfulByMe
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <ThumbsUp className={cn("h-3.5 w-3.5", review.helpfulByMe && "fill-current")} />
                    Hữu ích{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data && data.totalCount > 5 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page + 1} / {Math.ceil(data.totalCount / 5)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={page >= Math.ceil(data.totalCount / 5) - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
