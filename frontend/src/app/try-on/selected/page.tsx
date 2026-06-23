"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTryOnStore } from "@/stores/tryon-store";
import { EmptyState } from "@/components/common/EmptyState";

export default function TryOnSelectedPage() {
  const router = useRouter();
  const { selectedItems } = useTryOnStore();

  if (selectedItems.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <EmptyState
          title="Chưa chọn item nào"
          description="Quay lại chọn sản phẩm để thử mặc."
          actionLabel="Chọn sản phẩm"
          actionHref="/try-on"
        />
      </div>
    );
  }

  const categories = ["top", "bottom", "outerwear", "shoes", "accessory"];
  const missing = categories.filter(
    (c) => !selectedItems.some((i) => i.category.toLowerCase().includes(c))
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Outfit đang chọn</h1>
      <p className="mt-2 text-stone-500">{selectedItems.length} item đã chọn</p>

      <div className="mt-8 space-y-4">
        {selectedItems.map((item) => (
          <Card key={item.productId}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-stone-100">
                <Image src={item.imageUrl || "/placeholder-product.svg"} alt={item.name} fill className="object-cover" unoptimized />
              </div>
              <div>
                <p className="text-xs text-stone-500">{item.category}</p>
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
    </div>
  );
}
