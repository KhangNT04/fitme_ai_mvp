"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** Upper bound (stock). Undefined = unbounded (up to 99). */
  max?: number;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
  label?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled,
  size = "default",
  className,
  label = "Số lượng",
}: QuantityStepperProps) {
  const cap = Math.min(99, max ?? 99);
  const btn = cn(
    "flex items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
    size === "sm" ? "h-7 w-7" : "h-9 w-9",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-xl border border-border bg-card", className)}
    >
      <button
        type="button"
        className={btn}
        aria-label="Giảm số lượng"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn("min-w-8 text-center font-medium tabular-nums", size === "sm" ? "text-xs" : "text-sm")}
        aria-live="polite"
        data-testid="quantity-value"
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        aria-label="Tăng số lượng"
        disabled={disabled || value >= cap}
        onClick={() => onChange(Math.min(cap, value + 1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
