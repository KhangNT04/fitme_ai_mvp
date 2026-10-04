"use client";

import { cn } from "@/lib/utils";
import {
  getVariantOptions,
  isColorAvailable,
  isSizeAvailable,
} from "@/lib/variant-selection";
import type { ProductVariant } from "@/types/product";

interface VariantPickerProps {
  variants: ProductVariant[];
  color: string | undefined;
  size: string | undefined;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
}

/** Color swatch + size pill picker. Unavailable (sold out) options stay visible but struck-through. */
export function VariantPicker({ variants, color, size, onColorChange, onSizeChange }: VariantPickerProps) {
  const { colors, sizes } = getVariantOptions(variants);

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Màu sắc{color ? <span className="ml-1.5 font-normal text-muted-foreground">{color}</span> : null}
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn màu">
            {colors.map((c) => {
              const selected = c.name === color;
              const available = isColorAvailable(variants, c.name, size);
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onColorChange(c.name)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40",
                    !available && "text-muted-foreground line-through opacity-60",
                  )}
                >
                  {c.hex && (
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    />
                  )}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Kích cỡ{size ? <span className="ml-1.5 font-normal text-muted-foreground">{size}</span> : null}
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn size">
            {sizes.map((s) => {
              const selected = s === size;
              const available = isSizeAvailable(variants, s, color);
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSizeChange(s)}
                  className={cn(
                    "min-w-11 rounded-xl border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card hover:border-primary/40",
                    !available && !selected && "text-muted-foreground line-through opacity-60",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
