"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Palette, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useHydrateConsultationProfiles } from "@/hooks/use-hydrate-consultation-profiles";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEffect, useSyncExternalStore } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

const steps = [
  { icon: User, title: "Thông tin cơ thể", desc: "Chiều cao, cân nặng, gu mặc", href: "/ai/body-profile" },
  { icon: Palette, title: "Gu thời trang", desc: "Phong cách và màu sắc ưa thích", href: "/ai/style-profile" },
  { icon: Calendar, title: "Hoàn cảnh", desc: "Dịp mặc và vibe mong muốn", href: "/ai/occasion" },
];

export default function AiStartPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const selectedProductId = useConsultationStore((s) => s.draft.selectedProductId);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  useHydrateConsultationProfiles();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={1}
        title="Bắt đầu tư vấn AI"
        subtitle="Hoàn thành 3 bước để nhận gợi ý outfit phù hợp với bạn."
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá"
      />

      {mounted && selectedProductId && (
        <div className="mb-4 rounded-xl border border-border/60 bg-muted/80 p-3 text-sm shadow-sm sm:mb-6 sm:rounded-2xl sm:p-4">
          Đang tư vấn cho sản phẩm đã chọn
        </div>
      )}

      <div className="space-y-2 sm:space-y-3">
        {steps.map((step, i) => (
          <Card key={step.href} className="overflow-hidden">
            <CardContent className="flex items-center gap-2.5 p-3 sm:gap-4 sm:p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm">
                {i + 1}
              </div>
              <step.icon className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="truncate text-xs text-muted-foreground">{step.desc}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href={step.href} aria-label={step.title}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="mt-6 min-h-11 w-full sm:mt-8" size="lg" variant="ai" onClick={() => router.push("/ai/body-profile")}>
        Bắt đầu nhập thông tin
      </Button>
    </PageShell>
  );
}
