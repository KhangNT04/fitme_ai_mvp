"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, Shirt, Palette, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { consumerShellHorizontalClass, consumerShellMaxWidthClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Sparkles,
    title: "Tư vấn size & phối đồ",
    desc: "AI gợi ý outfit phù hợp dáng người, gu và hoàn cảnh của bạn.",
    accent: "from-violet-500/15 to-fuchsia-500/10",
  },
  {
    icon: Shirt,
    title: "Thử mặc bằng AI",
    desc: "Xem minh họa 2D trước khi quyết định mua.",
    accent: "from-pink-500/15 to-rose-500/10",
  },
  {
    icon: Palette,
    title: "Gợi ý màu & form",
    desc: "Tìm size, form và màu sắc phù hợp nhất.",
    accent: "from-purple-500/15 to-violet-500/10",
  },
  {
    icon: Camera,
    title: "Preview outfit 2D",
    desc: "Upload ảnh để xem outfit minh họa trên hình của bạn.",
    accent: "from-fuchsia-500/15 to-pink-500/10",
  },
];

const MARQUEE_ITEMS = [
  "K-Fashion",
  "Linen Muse",
  "Seoul Basic",
  "AI Styling",
  "Try Before Buy",
  "New Season",
  "Office Chic",
  "Weekend Edit",
];

const LOOKBOOK = [
  {
    label: "Office Chic",
    image: "/collections/office-chic.jpg",
    imageAlt: "Office Chic — blazer linen và quần tây thanh lịch",
    gradient: "from-slate-900/40 via-violet-950/20 to-fuchsia-900/30",
    rotate: "-rotate-3",
    z: "z-10",
    size: "h-72 w-52",
  },
  {
    label: "Weekend Casual",
    image: "/collections/weekend-casual.jpg",
    imageAlt: "Weekend Casual — street style cuối tuần",
    gradient: "from-rose-900/35 via-pink-900/15 to-violet-900/25",
    rotate: "rotate-2",
    z: "z-20 -mt-16 ml-8",
    size: "h-80 w-56",
  },
  {
    label: "Evening Edit",
    image: "/collections/evening-edit.jpg",
    imageAlt: "Evening Edit — váy tối và phụ kiện sang trọng",
    gradient: "from-indigo-950/50 via-purple-900/30 to-rose-900/35",
    rotate: "rotate-6",
    z: "z-30 -mt-20 ml-4",
    size: "h-64 w-48",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();

  const handleStartConsultation = async () => {
    await ensureSession();
    router.push("/ai/start");
  };

  return (
    <div className="overflow-hidden">
      {/* Hero — editorial split */}
      <section className="editorial-hero relative min-h-[70vh] sm:min-h-[88vh] lg:min-h-[92vh]">
        <Image
          src="/home-hero-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-top"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/75 to-violet-100/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/20" />
        <div className={cn("relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24", consumerShellHorizontalClass, consumerShellMaxWidthClass)}>
          <div className="relative z-10">
            <Badge variant="ai" className="animate-fade-up mb-5 shadow-md">
              Styling powered by AI
            </Badge>
            <h1 className="animate-fade-up animate-fade-up-delay-1 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.
            </h1>
            <p className="animate-fade-up animate-fade-up-delay-2 mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              FitMe AI giúp bạn tư vấn size, phối đồ và xem preview outfit 2D minh họa.
              Không cần đăng nhập để bắt đầu.
            </p>
            <div className="animate-fade-up animate-fade-up-delay-3 mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Button size="lg" variant="ai" className="btn-shimmer h-12 min-h-11 w-full px-8 text-base sm:w-auto" onClick={handleStartConsultation}>
                <Sparkles className="h-4 w-4" />
                Bắt đầu tư vấn outfit
              </Button>
              <Button size="lg" variant="outline" className="glass-panel h-12 min-h-11 w-full border-white/80 px-8 text-base sm:w-auto" asChild>
                <Link href="/discover">
                  Khám phá sản phẩm
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <dl className="animate-fade-up animate-fade-up-delay-4 mt-12 grid grid-cols-3 gap-6 border-t border-border/60 pt-8">
              <div>
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">AI Try-on</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-foreground">2D</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Size match</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-foreground">Smart</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Miễn phí</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-foreground">Start</dd>
              </div>
            </dl>
          </div>

          {/* Lookbook stack — fashion editorial mock */}
          <div className="relative z-0 hidden min-h-[420px] lg:block">
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-end justify-end pr-4">
              {LOOKBOOK.map((item) => (
                <div
                  key={item.label}
                  className={`lookbook-card absolute right-0 ${item.size} ${item.rotate} ${item.z}`}
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 224px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-white/5" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Collection</p>
                    <p className="font-display text-sm font-semibold text-white">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee strip */}
      <div className="border-y border-border/60 bg-[var(--fashion-ink)] py-3.5 text-white/90">
        <div className="overflow-hidden">
          <div className="fashion-marquee-track gap-12 px-6">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={`${item}-${i}`} className="flex shrink-0 items-center gap-12 text-sm font-medium uppercase tracking-[0.25em]">
                {item}
                <span className="h-1 w-1 rounded-full bg-fuchsia-400" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className={cn("py-20", consumerShellHorizontalClass, consumerShellMaxWidthClass)}>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Curated for you</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">Tính năng nổi bật</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Mọi thứ bạn cần để chọn outfit tự tin hơn</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className={`group glass-panel border-white/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 ${i % 2 === 1 ? "lg:mt-8" : ""}`}
            >
              <CardContent className="p-7">
                <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br p-3.5 ${f.accent} ring-1 ring-white/50 transition-transform duration-500 group-hover:scale-110`}>
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden pb-mobile-nav md:pb-0">
        <div className="gradient-fashion absolute inset-0" />
        <div className="absolute inset-0 opacity-30">
          <div className="fashion-grain h-full w-full opacity-100" />
        </div>
        <div className={cn("relative py-20 text-center", consumerShellHorizontalClass, consumerShellMaxWidthClass)}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Your style journey</p>
          <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">Sẵn sàng thử?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/75">Bắt đầu tư vấn AI miễn phí — chỉ mất vài phút.</p>
          <Button
            className="btn-shimmer mt-8 h-12 border-0 bg-white px-10 text-base font-semibold text-[var(--fashion-ink)] shadow-xl hover:bg-white/95"
            size="lg"
            onClick={handleStartConsultation}
          >
            <Sparkles className="h-4 w-4 text-violet-600" />
            Bắt đầu tư vấn outfit
          </Button>
        </div>
      </section>
    </div>
  );
}
