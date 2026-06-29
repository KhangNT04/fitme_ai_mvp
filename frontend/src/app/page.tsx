"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Shirt, Palette, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEnsureSession } from "@/hooks/use-ensure-session";

const features = [
  {
    icon: Sparkles,
    title: "Tư vấn size & phối đồ",
    desc: "AI gợi ý outfit phù hợp dáng người, gu và hoàn cảnh của bạn.",
    accent: "from-amber-500/15 to-orange-500/10",
  },
  {
    icon: Shirt,
    title: "Thử mặc bằng AI",
    desc: "Xem minh họa 2D trước khi quyết định mua.",
    accent: "from-yellow-500/15 to-amber-500/10",
  },
  {
    icon: Palette,
    title: "Gợi ý màu & form",
    desc: "Tìm size, form và màu sắc phù hợp nhất.",
    accent: "from-orange-500/15 to-red-500/10",
  },
  {
    icon: Camera,
    title: "Preview outfit 2D",
    desc: "Upload ảnh để xem outfit minh họa trên hình của bạn.",
    accent: "from-rose-500/15 to-orange-500/10",
  },
];

const MARQUEE_ITEMS = [
  "K-Fashion",
  "Smart Fit",
  "AI Styling",
  "Try Before Buy",
  "Size Perfect",
  "New Season",
  "Editorial Look",
  "Wardrobe Mix",
];

const LOOKBOOK = [
  { label: "Office Chic", gradient: "from-stone-800 via-amber-900 to-orange-800", rotate: "-rotate-3", z: "z-10", size: "h-72 w-52" },
  { label: "Weekend Casual", gradient: "from-amber-600 via-yellow-500 to-orange-600", rotate: "rotate-2", z: "z-20 -mt-16 ml-8", size: "h-80 w-56" },
  { label: "Evening Edit", gradient: "from-stone-900 via-amber-800 to-red-700", rotate: "rotate-6", z: "z-30 -mt-20 ml-4", size: "h-64 w-48" },
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
      <section className="editorial-hero relative min-h-[88vh] lg:min-h-[92vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-orange-50/30" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="relative z-10">
            <Badge variant="ai" className="animate-fade-up mb-5 shadow-md">
              Styling powered by AI
            </Badge>
            <h1 className="animate-fade-up animate-fade-up-delay-1 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.
            </h1>
            <p className="animate-fade-up animate-fade-up-delay-2 mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              FitMe AI giúp bạn tư vấn size, phối đồ và xem preview outfit 2D minh họa.
              Không cần đăng nhập để bắt đầu.
            </p>
            <div className="animate-fade-up animate-fade-up-delay-3 mt-10 flex flex-wrap gap-4">
              <Button size="lg" variant="ai" className="btn-shimmer h-12 px-8 text-base" onClick={handleStartConsultation}>
                <Sparkles className="h-4 w-4" />
                Bắt đầu tư vấn outfit
              </Button>
              <Button size="lg" variant="outline" className="glass-panel h-12 border-white/80 px-8 text-base" asChild>
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
                  className={`lookbook-card absolute right-0 ${item.size} ${item.rotate} ${item.z} bg-gradient-to-br ${item.gradient}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10" />
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
                <span className="h-1 w-1 rounded-full bg-amber-400" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Curated for you</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">Tính năng nổi bật</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Mọi thứ bạn cần để chọn outfit tự tin hơn</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className={`group glass-panel border-white/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 ${i % 2 === 1 ? "lg:mt-8" : ""}`}
            >
              <CardContent className="p-7">
                <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br p-3.5 ${f.accent} ring-1 ring-white/50 transition-transform duration-500 group-hover:scale-110`}>
                  <f.icon className="h-6 w-6 text-amber-700" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden">
        <div className="gradient-fashion absolute inset-0" />
        <div className="absolute inset-0 opacity-30">
          <div className="fashion-grain h-full w-full opacity-100" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Your style journey</p>
          <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">Sẵn sàng thử?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/75">Bắt đầu tư vấn AI miễn phí — chỉ mất vài phút.</p>
          <Button
            className="btn-shimmer mt-8 h-12 border-0 bg-white px-10 text-base font-semibold text-[var(--fashion-ink)] shadow-xl hover:bg-white/95"
            size="lg"
            onClick={handleStartConsultation}
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            Bắt đầu tư vấn outfit
          </Button>
        </div>
      </section>
    </div>
  );
}
