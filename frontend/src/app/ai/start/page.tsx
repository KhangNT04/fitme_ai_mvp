"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Palette, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

const steps = [
  { icon: User, title: "Thông tin cơ thể", desc: "Chiều cao, cân nặng, gu mặc", href: "/ai/body-profile" },
  { icon: Palette, title: "Gu thời trang", desc: "Phong cách và màu sắc ưa thích", href: "/ai/style-profile" },
  { icon: Calendar, title: "Hoàn cảnh", desc: "Dịp mặc và vibe mong muốn", href: "/ai/occasion" },
];

export default function AiStartPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const selectedProductId = useConsultationStore((s) => s.draft.selectedProductId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void ensureSession();
  }, [ensureSession]);

  return (
    <PageShell width="medium">
      <PageHeader
        title="Bắt đầu tư vấn AI"
        subtitle="Hoàn thành 3 bước để nhận gợi ý outfit phù hợp với bạn."
        showAiBadge
        backHref="/"
        backLabel="Trang chủ"
      />

      {mounted && selectedProductId && (
        <div className="mb-6 rounded-2xl bg-accent/80 p-4 text-sm text-accent-foreground">
          Đang tư vấn cho sản phẩm đã chọn
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, i) => (
          <Card key={step.href}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                {i + 1}
              </div>
              <step.icon className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href={step.href}><ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="mt-8 w-full" size="lg" variant="ai" onClick={() => router.push("/ai/body-profile")}>
        Bắt đầu nhập thông tin
      </Button>
    </PageShell>
  );
}
