import { cn } from "@/lib/utils";

export interface SummaryCardItem {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success";
}

const TONE: Record<NonNullable<SummaryCardItem["tone"]>, string> = {
  default: "border-border/60 bg-card",
  warning: "border-amber-200/80 bg-amber-50/50",
  success: "border-emerald-200/80 bg-emerald-50/50",
};

/** Responsive KPI cards for portal pages. */
export function SummaryCards({ items, className }: { items: SummaryCardItem[]; className?: string }) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", items.length === 3 && "xl:grid-cols-3", className)}
      data-testid="summary-cards"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("rounded-2xl border p-4 shadow-sm", TONE[item.tone ?? "default"])}
          data-testid="summary-card"
        >
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums">{item.value}</p>
          {item.hint && <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
