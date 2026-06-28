import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface FlowStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function FlowStepper({ steps, currentStep, className }: FlowStepperProps) {
  return (
    <div className={cn("w-full", className)} aria-hidden="true">
      {/* Circles + connectors — single row, evenly aligned */}
      <div className="flex items-center">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const active = stepNum === currentStep;
          const done = stepNum < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <Fragment key={label}>
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    active && "gradient-ai text-white shadow-sm",
                    done && "bg-primary/15 text-primary",
                    !active && !done && "bg-muted text-muted-foreground"
                  )}
                >
                  {stepNum}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1.5 h-0.5 min-w-[0.75rem] flex-1 rounded-full sm:mx-2",
                    done ? "bg-primary/40" : "bg-border"
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      {/* Labels — evenly distributed under circles */}
      <div
        className="mt-1.5 grid w-full"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const active = stepNum === currentStep;
          return (
            <span
              key={label}
              className={cn(
                "truncate px-0.5 text-center text-[10px] font-medium sm:text-xs",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const AI_FLOW_STEPS = ["Cơ thể", "Phong cách", "Hoàn cảnh", "Kết quả"];
export const TRYON_FLOW_STEPS = ["Chọn đồ", "Thông tin", "Kết quả"];
