import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format-price";

interface PriceBreakdownProps {
  subtotalVnd: number;
  shippingFeeVnd?: number;
  discountVnd?: number;
  totalVnd: number;
  /** Shown instead of the shipping amount when shipping is not known yet (cart page). */
  shippingNote?: string;
  className?: string;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "discount" }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", tone === "discount" && "font-medium text-emerald-700")}>{value}</span>
    </div>
  );
}

export function PriceBreakdown({
  subtotalVnd,
  shippingFeeVnd,
  discountVnd = 0,
  totalVnd,
  shippingNote,
  className,
}: PriceBreakdownProps) {
  return (
    <div className={cn("space-y-2", className)} data-testid="price-breakdown">
      <Row label="Tạm tính" value={formatPrice(subtotalVnd)} />
      {shippingNote ? (
        <Row label="Phí vận chuyển" value={shippingNote} />
      ) : (
        <Row label="Phí vận chuyển" value={formatPrice(shippingFeeVnd ?? 0)} />
      )}
      {discountVnd > 0 && <Row label="Giảm phí ship (voucher)" value={`-${formatPrice(discountVnd)}`} tone="discount" />}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <span className="font-semibold">Tổng cộng</span>
        <span className="font-display text-lg font-bold tabular-nums" data-testid="price-total">
          {formatPrice(totalVnd)}
        </span>
      </div>
    </div>
  );
}
