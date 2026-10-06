import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BrandPlusBadgeProps {
  className?: string;
  /** compact = product cards; default = detail and brand headers */
  size?: "default" | "compact";
}

export function BrandPlusBadge({ className, size = "default" }: BrandPlusBadgeProps) {
  return (
    <Badge
      variant="outline"
      title="Brand đối tác FitMe Brand Plus"
      className={cn(
        "shrink-0 gap-0.5 border-amber-300/80 bg-amber-50 font-semibold normal-case tracking-normal text-amber-800",
        size === "compact" ? "px-1.5 py-0 text-[9px] sm:text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      <BadgeCheck className={size === "compact" ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5"} aria-hidden />
      Brand Plus
    </Badge>
  );
}
