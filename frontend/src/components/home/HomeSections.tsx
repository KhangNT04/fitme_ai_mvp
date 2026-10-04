"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, CheckCircle2, ChevronDown, ShoppingBag, Sparkles, Star, ThumbsUp, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewApi } from "@/services/review-api";
import { consumerShellHorizontalClass, consumerShellMaxWidthClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const sectionClass = cn("py-16 sm:py-20", consumerShellHorizontalClass, consumerShellMaxWidthClass);

const STEPS = [
  {
    icon: UserRound,
    title: "Nhập số đo & phong cách",
    desc: "Chiều cao, cân nặng, dáng người và dịp bạn cần mặc — chưa cần đăng nhập.",
  },
  {
    icon: Sparkles,
    title: "AI gợi ý size & outfit",
    desc: "Nhận size phù hợp từng sản phẩm và các set đồ phối sẵn theo gu của bạn.",
  },
  {
    icon: Camera,
    title: "Thử mặc trên ảnh của bạn",
    desc: "Tải ảnh toàn thân, AI tạo ảnh bạn đang mặc sản phẩm để xem form và màu.",
  },
  {
    icon: ShoppingBag,
    title: "Mua ngay trong app",
    desc: "Đặt hàng từ các brand đối tác, thanh toán COD hoặc chuyển khoản PayOS.",
  },
];

export const HOME_FAQ = [
  {
    q: "FitMe AI là gì?",
    a: "FitMe AI là ứng dụng thời trang giúp bạn chọn đúng size, phối đồ và thử mặc bằng AI trước khi mua, sau đó đặt hàng trực tiếp từ các brand đối tác ngay trong app.",
  },
  {
    q: "Thử mặc bằng AI hoạt động thế nào?",
    a: "Bạn chọn sản phẩm và tải lên một ảnh toàn thân rõ nét. AI sẽ tạo ảnh bạn đang mặc sản phẩm đó trong khoảng vài chục giây. Ảnh mang tính minh họa — màu sắc và độ ôm thực tế có thể chênh lệch nhẹ, vì vậy hãy kết hợp với gợi ý size.",
  },
  {
    q: "Fitken là gì và nhận ở đâu?",
    a: "Fitken là đơn vị dùng cho mỗi lượt thử mặc AI (1 Fitken/lượt). Tài khoản mới được tặng 5 Fitken; bạn nhận thêm khi điểm danh 3 ngày liên tục (+1), chia sẻ ảnh thử đồ (+2) hoặc đánh giá sản phẩm đã mua kèm ảnh (+3).",
  },
  {
    q: "FitMe Pro có gì?",
    a: "Gói Pro 49.000đ/tháng gồm 15 Fitken mỗi tháng và 2 voucher freeship. Tư vấn size, phối đồ và mua sắm vẫn miễn phí cho mọi người.",
  },
  {
    q: "Ảnh của tôi có an toàn không?",
    a: "Ảnh chỉ được dùng để tạo kết quả thử mặc cho chính bạn và không được chia sẻ công khai nếu bạn không đồng ý. Bạn có thể xóa ảnh trong tủ đồ hoặc gửi yêu cầu xóa dữ liệu tại Hồ sơ → Quyền riêng tư.",
  },
  {
    q: "Thanh toán và đổi trả thế nào?",
    a: "Bạn có thể trả tiền khi nhận hàng (COD) hoặc chuyển khoản qua PayOS. Đơn đã thanh toán mà bị hủy sẽ được hoàn tiền. Nếu cần đổi size, hãy liên hệ FitMe để được hỗ trợ cùng brand.",
  },
];

export function HowItWorksSection() {
  return (
    <section className={sectionClass} aria-labelledby="how-it-works">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">How it works</p>
        <h2 id="how-it-works" className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          4 bước để mua đúng ngay lần đầu
        </h2>
      </div>
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative rounded-2xl border border-border/60 bg-white/80 p-6 shadow-sm">
            <span className="absolute right-5 top-5 font-display text-3xl font-extrabold text-primary/15">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="inline-flex rounded-xl bg-primary/10 p-3">
              <step.icon className="h-5 w-5 text-primary" />
            </span>
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Real customer reviews only; renders nothing until there are some. */
export function FeaturedReviewsSection() {
  const { data } = useQuery({
    queryKey: ["featured-reviews"],
    queryFn: () => reviewApi.getFeaturedReviews(6),
    staleTime: 5 * 60_000,
  });
  if (!data || data.length === 0) return null;

  return (
    <section className={sectionClass} aria-labelledby="featured-reviews">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Khách hàng nói gì</p>
        <h2 id="featured-reviews" className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Đánh giá từ người dùng FitMe
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.map((review) => (
          <figure key={review.id} className="flex flex-col rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${review.rating} sao`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-current" : "text-muted")} />
              ))}
            </div>
            <blockquote className="mt-3 line-clamp-5 flex-1 text-sm leading-relaxed text-foreground">“{review.content}”</blockquote>
            <figcaption className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
              {review.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                  {review.authorName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 text-xs">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {review.authorName}
                  {review.verifiedPurchase && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-label="Đã mua hàng" />}
                </p>
                <Link href={`/products/${review.productId}`} className="block truncate text-muted-foreground hover:text-primary">
                  {review.productName}
                </Link>
                {review.helpfulCount > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    <ThumbsUp className="h-3 w-3" /> {review.helpfulCount} người thấy hữu ích
                  </p>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PricingTeaserSection() {
  return (
    <section className={sectionClass} aria-labelledby="pricing-teaser">
      <div className="grid items-center gap-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-violet-50 via-white to-pink-50 p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Bảng giá</p>
          <h2 id="pricing-teaser" className="mt-3 font-display text-3xl font-bold text-foreground">
            Miễn phí để bắt đầu, Pro khi bạn cần nhiều hơn
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tư vấn size, phối đồ và mua sắm luôn miễn phí. Thử mặc AI dùng Fitken — tài khoản mới được tặng 5 Fitken.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Free</p>
            <p className="mt-1 font-display text-2xl font-bold">0đ</p>
            <p className="mt-2 text-sm text-muted-foreground">5 Fitken dùng thử + nhiệm vụ nhận thêm Fitken</p>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-white p-5 shadow-md shadow-violet-500/10">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">FitMe Pro</p>
            <p className="mt-1 font-display text-2xl font-bold">49.000đ<span className="text-sm font-medium text-muted-foreground">/tháng</span></p>
            <p className="mt-2 text-sm text-muted-foreground">15 Fitken mỗi tháng + 2 voucher freeship</p>
          </div>
          <Button asChild variant="outline" className="rounded-full sm:col-span-2">
            <Link href="/pricing">
              Xem chi tiết gói <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className={cn(sectionClass, "scroll-mt-24")} aria-labelledby="faq-title">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">FAQ</p>
        <h2 id="faq-title" className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Câu hỏi thường gặp
        </h2>
      </div>
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/60 bg-white/90">
        {HOME_FAQ.map((item) => (
          <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Còn thắc mắc?{" "}
        <Link href="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
          Liên hệ FitMe
        </Link>
      </p>
    </section>
  );
}
