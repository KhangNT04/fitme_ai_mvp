"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTryOnStore } from "@/stores/tryon-store";

export function TryOnSelectionBar() {
  const router = useRouter();
  const { selectedItems, removeItem } = useTryOnStore();

  if (selectedItems.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border/60 bg-muted/80 p-3 shadow-sm sm:mb-6 sm:rounded-2xl sm:p-4">
      <p className="text-sm font-medium">Đã chọn ({selectedItems.length})</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedItems.map((item) => (
          <Badge
            key={item.productId}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => removeItem(item.productId)}
          >
            {item.name} ×
          </Badge>
        ))}
      </div>
      <Button className="mt-4 min-h-11 w-full sm:w-auto" onClick={() => router.push("/try-on/selected")}>
        Tiếp tục thử outfit
      </Button>
    </div>
  );
}
