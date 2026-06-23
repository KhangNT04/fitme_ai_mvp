"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Palette, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEffect } from "react";

const steps = [
  { icon: User, title: "Thông tin cơ thể", desc: "Chiều cao, cân nặng, gu mặc", href: "/ai/body-profile" },
  { icon: Palette, title: "Gu thời trang", desc: "Phong cách và màu sắc ưa thích", href: "/ai/style-profile" },
  { icon: Calendar, title: "Hoàn cảnh", desc: "Dịp mặc và vibe mong muốn", href: "/ai/occasion" },
];

export default function AiStartPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const { draft } = useConsultationStore();

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Bắt đầu tư vấn AI</h1>
      <p className="mt-2 text-stone-500">
        Hoàn thành 3 bước để nhận gợi ý outfit phù hợp với bạn.
      </p>

      {draft.selectedProductId && (
        <div className="mt-4 rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
          Đang tư vấn cho sản phẩm đã chọn
        </div>
      )}

      <div className="mt-8 space-y-4">
        {steps.map((step, i) => (
          <Card key={step.href}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white text-sm font-bold">
                {i + 1}
              </div>
              <step.icon className="h-6 w-6 text-stone-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900">{step.title}</h3>
                <p className="text-sm text-stone-500">{step.desc}</p>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href={step.href}><ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="mt-8 w-full" size="lg" onClick={() => router.push("/ai/body-profile")}>
        Bắt đầu nhập thông tin
      </Button>
    </div>
  );
}
