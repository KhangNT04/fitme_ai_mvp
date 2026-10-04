"use client";

import { cn } from "@/lib/utils";

interface StatusTabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

/** Horizontally scrollable status filter pills (orders / seller orders). */
export function StatusTabs({ tabs, value, onChange, className, ariaLabel = "Lọc theo trạng thái" }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
