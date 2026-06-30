"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTryOnStore } from "@/stores/tryon-store";
import { EmptyState } from "@/components/common/EmptyState";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function TryOnSelectedPage() {
  const router = useRouter();
  const { selectedItems } = useTryOnStore();

  if (selectedItems.length === 0) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <FlowWizardToolbar steps={TRYON_FLOW_STEPS} currentStep={1} title="Outfit đang chọn" backHref="/try-on" backLabel="Chọn sản phẩm" />
        <EmptyState
          title="Chưa chọn item nào"
          description="Quay lại chọn sản phẩm để thử mặc."
          actionLabel="Chọn sản phẩm"
          actionHref="/try-on"
        />
      </PageShell>
    );
  }

  const categories = ["top", "bottom", "outerwear", "shoes", "accessory"];
  const missing = categories.filter(
    (c) => !selectedItems.some((i) => i.category.toLowerCase().includes(c))
  );

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={1}
        title="Outfit đang chọn"
        subtitle={`${selectedItems.length} item đã chọn`}
        backHref="/try-on"
        backLabel="Chọn sản phẩm"
      />

      <div className="space-y-4">
        {selectedItems.map((item) => (
          <Card key={item.productId}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                <Image src={item.imageUrl || "/placeholder-product.svg"} alt={item.name} fill className="object-cover" unoptimized />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <p className="font-medium">{item.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {missing.length > 0 && (
        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          AI gợi ý bổ sung: {missing.join(", ")}. Bạn có thể tiếp tục hoặc quay lại chọn thêm.
        </div>
      )}

      <Button className="mt-8 w-full" size="lg" onClick={() => router.push("/try-on/input")}>
        Tiếp tục nhập thông tin
      </Button>
    </PageShell>
  );
}
