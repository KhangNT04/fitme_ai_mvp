import { AlertCircle } from "lucide-react";
import { AI_DISCLAIMER } from "@/utils/constants";
import { cn } from "@/lib/utils";

interface DisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function Disclaimer({ className, compact }: DisclaimerProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-amber-900 shadow-sm",
        compact && "p-3 text-xs",
        className
      )}
      role="note"
    >
      <AlertCircle className={cn("shrink-0 text-amber-600", compact ? "h-4 w-4" : "h-5 w-5")} />
      <p className={cn("leading-relaxed", compact ? "text-xs" : "text-sm")}>
        {AI_DISCLAIMER}
      </p>
    </div>
  );
}
