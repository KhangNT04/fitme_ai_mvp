"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { effectiveWardrobeMode, wardrobeModeOptions } from "@/lib/wardrobe-mode";
import type { WardrobeMode } from "@/types/user";

interface WardrobeModeSelectorProps {
  value: WardrobeMode;
  premium: boolean;
  onChange: (mode: WardrobeMode) => void;
  disabled?: boolean;
}

/** Chooses how the stylist uses the personal wardrobe; wardrobe modes are FitMe Premium only. */
export function WardrobeModeSelector({ value, premium, onChange, disabled }: WardrobeModeSelectorProps) {
  const current = effectiveWardrobeMode(value, premium);
  const options = wardrobeModeOptions(premium);
  const hasLocked = options.some((o) => o.locked);

  return (
    <div className="space-y-1.5" data-testid="wardrobe-mode-selector">
      <p className="text-[11px] font-medium text-muted-foreground">Nguồn đồ để phối</p>
      <div role="radiogroup" aria-label="Nguồn đồ để phối" className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = !option.locked && current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={option.locked || disabled ? true : undefined}
              disabled={disabled || option.locked}
              title={option.locked ? "Tính năng của FitMe Premium" : undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-foreground hover:bg-muted",
                option.locked && "cursor-not-allowed opacity-60 hover:bg-background",
              )}
            >
              {option.locked && <Lock className="h-3 w-3" aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {hasLocked && (
        <p className="text-[11px] text-muted-foreground">
          Phối kèm đồ trong tủ đồ là tính năng của FitMe Premium.{" "}
          <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            Xem gói Premium
          </Link>
        </p>
      )}
    </div>
  );
}
