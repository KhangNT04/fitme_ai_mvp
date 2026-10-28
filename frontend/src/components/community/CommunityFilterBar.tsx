"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { CommunityFilterOption, CommunityFilterOptions } from "@/types";

/** The filters a reader picked on the community feed. */
export interface CommunityFeedFilters {
  styleLabel?: string;
  occasion?: string;
  brandId?: string;
}

function countLabel(count: number): string {
  return count > 0 ? ` ${count}` : "";
}

/**
 * The filter bar of the community feed: style, occasion and brand.
 *
 * <p>Only one value can be picked per group — a second tap clears it — and a "Xoá lọc"
 * button appears as soon as something is selected, so the reader never wonders why the feed
 * looks short.
 */
export function CommunityFilterBar({
  options,
  value,
  onChange,
  className,
}: {
  options: CommunityFilterOptions;
  value: CommunityFeedFilters;
  onChange: (next: CommunityFeedFilters) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const groups: { key: keyof CommunityFeedFilters; label: string; items: CommunityFilterOption[] }[] = [
    { key: "styleLabel", label: "Phong cách", items: options.styles },
    { key: "occasion", label: "Dịp mặc", items: options.occasions },
    { key: "brandId", label: "Thương hiệu", items: options.brands },
  ];

  const activeCount = Object.values(value).filter(Boolean).length;
  const hasFilters = activeCount > 0;

  const toggle = (key: keyof CommunityFeedFilters, item: CommunityFilterOption) => {
    onChange({
      ...value,
      [key]: value[key] === item.value ? undefined : item.value,
    });
  };

  if (options.styles.length === 0 && options.occasions.length === 0 && options.brands.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            hasFilters
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Bộ lọc
          {hasFilters && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Xoá lọc
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <Chip
                      key={item.value}
                      selected={value[group.key] === item.value}
                      onClick={() => toggle(group.key, item)}
                      className="px-3 py-1 text-xs"
                    >
                      {item.label}
                      <span className="ml-1 opacity-70">{countLabel(item.count)}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
