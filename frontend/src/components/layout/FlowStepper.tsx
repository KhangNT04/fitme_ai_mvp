import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { useCollapsingHeader } from "@/hooks/use-collapsing-header";

interface FlowStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
  /** Shrunken sticky bar — smaller circles */
  compact?: boolean;
  /** Fit beside title in compact header row */
  inline?: boolean;
}

/** Equal inline step cell width (rem) — fits longest label with truncation */
const INLINE_STEP_CELL_REM = 3.25;

export function FlowStepper({ steps, currentStep, className, compact, inline }: FlowStepperProps) {
  const { scrollCompact } = useCollapsingHeader();
  const showLabels = inline ? !scrollCompact : !compact;
  const circleSize = compact
    ? "h-5 w-5 text-[9px] sm:h-6 sm:w-6 sm:text-[10px]"
    : "h-6 w-6 text-[10px] sm:h-8 sm:w-8 sm:text-xs";
  const connectorAlign = compact
    ? "mt-2.5 sm:mt-3"
    : "mt-3 sm:mt-4";

  return (
    <div
      className={cn(
        "transition-[padding] duration-200",
        inline ? "w-auto shrink-0" : "w-full",
        compact && "py-0",
        className,
      )}
      aria-label="Tiến trình các bước"
      role="navigation"
    >
      <div
        className={cn(
          "flex items-start",
          inline ? "justify-end gap-0" : "w-full gap-0",
        )}
      >
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const active = stepNum === currentStep;
          const done = stepNum < currentStep;
          const connectorActive = stepNum <= currentStep;

          return (
            <Fragment key={`${label}-${index}`}>
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 shrink-0 self-start rounded-full",
                    connectorAlign,
                    inline ? "w-2 sm:w-3" : "min-w-2 flex-1",
                    connectorActive ? "bg-primary/40" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
              <div
                className={cn(
                  "flex shrink-0 flex-col items-center",
                  !inline && "min-w-0 flex-1",
                  showLabels ? "gap-0.5 sm:gap-1" : "gap-0",
                )}
                style={inline ? { width: `${INLINE_STEP_CELL_REM}rem` } : undefined}
              >
                <div
                  className={cn(
                    "relative z-10 flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-background transition-all duration-200",
                    circleSize,
                    active && "gradient-ai text-white shadow-sm ring-background",
                    done && "bg-primary/15 text-primary",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {stepNum}
                </div>
                {showLabels && (
                  <span
                    className={cn(
                      "block w-full truncate px-0.5 text-center font-medium",
                      inline && compact ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-xs",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                    title={label}
                  >
                    {label}
                  </span>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const AI_FLOW_STEPS = ["Hồ sơ", "Tư vấn"];
export const TRYON_FLOW_STEPS = ["Chọn đồ", "Thông tin", "Kết quả"];
