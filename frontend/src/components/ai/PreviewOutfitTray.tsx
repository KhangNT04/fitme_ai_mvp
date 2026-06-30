"use client";

import { X } from "lucide-react";
import { AppImage } from "@/components/common/AppImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { outfitItemKey } from "@/lib/outfit-item-utils";
import type { OutfitItem } from "@/types/outfit";

interface PreviewOutfitTrayProps {
  items: OutfitItem[];
  onRemove?: (key: string) => void;
  compact?: boolean;
}

export function PreviewOutfitTray({ items, onRemove, compact = false }: PreviewOutfitTrayProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có món nào trong set. Thêm ít nhất một món để tạo preview.
      </p>
    );
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-3"}>
      {!compact && (
        <p className="text-sm font-medium text-foreground">
          Set đang chọn ({items.length})
        </p>
      )}
      <div className={compact ? "contents" : "grid gap-2 sm:grid-cols-2"}>
        {items.map((item) => {
          const key = outfitItemKey(item);
          if (compact) {
            return (
              <Badge key={key} variant="secondary" className="gap-1 pr-1">
                {item.name}
                {onRemove && (
                  <button
                    type="button"
                    aria-label={`Bỏ ${item.name}`}
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => onRemove(key)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          }

          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <AppImage
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {item.fromWardrobe ? "Tủ đồ" : item.category}
                </p>
                <p className="truncate font-medium text-foreground">{item.name}</p>
                {(item.size || item.color) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.size ? `Size ${item.size}` : null, item.color || null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              {onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label={`Bỏ ${item.name}`}
                  onClick={() => onRemove(key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
