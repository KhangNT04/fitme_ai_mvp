"use client";

import { cn } from "@/lib/utils";
import { SKIN_TONES } from "@/utils/constants";

type SkinToneValue = (typeof SKIN_TONES)[number]["value"];

interface SkinTonePickerProps {
  value?: SkinToneValue;
  onChange: (value: SkinToneValue | undefined) => void;
  className?: string;
}

export function SkinTonePicker({ value, onChange, className }: SkinTonePickerProps) {
  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-3", className)} role="radiogroup" aria-label="Tông da">
      {SKIN_TONES.map((tone) => {
        const selected = value === tone.value;
        const swatchColor = "color" in tone ? tone.color : undefined;

        return (
          <button
            key={tone.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={tone.label}
            title={tone.label}
            onClick={() => onChange(selected ? undefined : tone.value)}
            className={cn(
              "group flex flex-col items-center gap-1.5 rounded-lg p-1 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                selected
                  ? "scale-105 border-foreground shadow-sm ring-2 ring-foreground/15"
                  : "border-transparent hover:scale-105 hover:border-border",
                !swatchColor && "border-dashed border-muted-foreground/40 bg-muted text-xs font-medium text-muted-foreground",
              )}
              style={swatchColor ? { backgroundColor: swatchColor } : undefined}
            >
              {!swatchColor ? "?" : null}
            </span>
            <span
              className={cn(
                "max-w-[4.5rem] text-center text-[11px] leading-tight",
                selected ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {tone.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
