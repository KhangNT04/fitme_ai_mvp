"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OutfitSuggestions, TryOnSuggestedItem } from "@/types/tryon";

interface TryOnOutfitSuggestionsProps {
  suggestions: OutfitSuggestions;
  onAddItem?: (item: TryOnSuggestedItem) => void;
  compact?: boolean;
}

export function TryOnOutfitSuggestions({
  suggestions,
  onAddItem,
  compact = false,
}: TryOnOutfitSuggestionsProps) {
  const { outfitComplete, improvementSuggestions, suggestedItems } = suggestions;

  if (!improvementSuggestions.length && !suggestedItems.length) {
    return null;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {improvementSuggestions.length > 0 && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            outfitComplete
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {improvementSuggestions.map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : undefined}>
              {line}
            </p>
          ))}
        </div>
      )}

      {suggestedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Gợi ý bổ sung cho set</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedItems.map((item) => (
              <Card key={item.productId}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.imageUrl || "/placeholder-product.svg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  {onAddItem ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAddItem(item)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/try-on?product=${item.productId}`}>Thêm</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
