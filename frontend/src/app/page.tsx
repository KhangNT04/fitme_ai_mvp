"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Shirt, Palette, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEnsureSession } from "@/hooks/use-ensure-session";

const features = [
  {
    icon: Sparkles,
    title: "Tư vấn size & phối đồ",
    desc: "AI gợi ý outfit phù hợp dáng người, gu và hoàn cảnh của bạn.",
  },
  {
    icon: Shirt,
    title: "Thử mặc bằng AI",
    desc: "Xem minh họa 2D trước khi quyết định mua.",
  },
  {
    icon: Palette,
    title: "Gợi ý màu & form",
    desc: "Tìm size, form và màu sắc phù hợp nhất.",
  },
  {
    icon: Camera,
    title: "Preview outfit 2D",
    desc: "Upload ảnh để xem outfit minh họa trên hình của bạn.",
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
    <div>
      <section className="bg-gradient-to-b from-stone-100 to-stone-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Biết nên mặc gì — phù hợp dáng người, gu và hoàn cảnh
            </h1>
            <p className="mt-6 text-lg text-stone-600">
              FitMe AI giúp bạn tư vấn size, phối đồ và xem preview outfit 2D minh họa.
              Không cần đăng nhập để bắt đầu.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" onClick={handleStartConsultation}>
                Bắt đầu tư vấn outfit
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/discover">Khám phá sản phẩm</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-stone-900">Tính năng nổi bật</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <f.icon className="h-8 w-8 text-stone-700" />
                <h3 className="mt-4 font-semibold text-stone-900">{f.title}</h3>
                <p className="mt-2 text-sm text-stone-500">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900">Sẵn sàng thử?</h2>
          <p className="mt-2 text-stone-500">Bắt đầu tư vấn AI miễn phí — chỉ mất vài phút.</p>
          <Button className="mt-6" size="lg" onClick={handleStartConsultation}>
            Bắt đầu tư vấn outfit
          </Button>
        </div>
      </section>
    </div>
  );
}
