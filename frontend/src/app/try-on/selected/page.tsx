"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTryOnStore } from "@/stores/tryon-store";
import { useTryOnAddItem } from "@/hooks/use-tryon-add-item";
import { tryonApi } from "@/services/tryon-api";
import { TryOnOutfitSuggestions } from "@/components/tryon/TryOnOutfitSuggestions";
import { EmptyState } from "@/components/common/EmptyState";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function TryOnSelectedPage() {
  const router = useRouter();
  const { selectedItems } = useTryOnStore();
  const { addItem, ReplaceConfirmDialog } = useTryOnAddItem();

  const productIds = selectedItems.map((i) => i.productId);

  const { data: suggestions } = useQuery({
    queryKey: ["tryon-outfit-suggestions", productIds],
    queryFn: () => tryonApi.getOutfitSuggestions(productIds),
    enabled: productIds.length > 0,
  });

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

  const handleAddSuggestion = (item: { productId: string; name: string; category: string; imageUrl?: string }) => {
    addItem({
      productId: item.productId,
      category: item.category,
      name: item.name,
      imageUrl: item.imageUrl,
    });
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      {ReplaceConfirmDialog}
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={1}
        title="Outfit đang chọn"
        subtitle={`${selectedItems.length} món — mỗi loại chỉ 1 sản phẩm`}
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

      {suggestions && (
        <div className="mt-6">
          <TryOnOutfitSuggestions
            suggestions={suggestions}
            onAddItem={handleAddSuggestion}
          />
        </div>
      )}

      <Button className="mt-8 w-full" size="lg" onClick={() => router.push("/try-on/input")}>
        Tiếp tục nhập thông tin
      </Button>
    </PageShell>
  );
}
