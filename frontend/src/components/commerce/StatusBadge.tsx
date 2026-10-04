import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  orderStatusStyle,
  paymentStatusStyle,
  sellerOrderStatusStyle,
  settlementStatusStyle,
  shipmentStatusStyle,
  type StatusStyle,
} from "@/lib/commerce-labels";

function StyledBadge({ style, className }: { style: StatusStyle; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("whitespace-nowrap", style.className, className)}>
      {style.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StyledBadge style={orderStatusStyle(status)} className={className} />;
}

export function PaymentStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StyledBadge style={paymentStatusStyle(status)} className={className} />;
}

export function SellerOrderStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StyledBadge style={sellerOrderStatusStyle(status)} className={className} />;
}

export function ShipmentStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StyledBadge style={shipmentStatusStyle(status)} className={className} />;
}

export function SettlementStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StyledBadge style={settlementStatusStyle(status)} className={className} />;
}
