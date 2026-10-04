import { CheckCircle2, Circle, PackageCheck, Truck } from "lucide-react";
import { ShipmentStatusBadge } from "@/components/commerce/StatusBadge";
import { carrierLabel, shipmentStatusLabel } from "@/lib/commerce-labels";
import { formatCommerceDate, parseCommerceDate } from "@/lib/commerce-utils";
import { cn } from "@/lib/utils";
import type { Shipment } from "@/types/commerce";

interface ShipmentTimelineProps {
  shipment: Shipment | null | undefined;
  brandName?: string;
  className?: string;
}

/** Tracking timeline — newest event on top. */
export function ShipmentTimeline({ shipment, brandName, className }: ShipmentTimelineProps) {
  if (!shipment) {
    return (
      <div className={cn("rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground", className)}>
        {brandName ? `${brandName}: ` : ""}Chưa có thông tin vận chuyển. Shop sẽ cập nhật sau khi bàn giao cho đơn vị vận chuyển.
      </div>
    );
  }

  const events = [...(shipment.events ?? [])].sort((a, b) => {
    const ta = parseCommerceDate(a.occurredAt)?.getTime() ?? 0;
    const tb = parseCommerceDate(b.occurredAt)?.getTime() ?? 0;
    return tb - ta;
  });

  return (
    <div className={cn("space-y-4 rounded-xl border border-border/60 bg-card p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {brandName && <p className="text-sm font-semibold">{brandName}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            {carrierLabel(shipment.carrier)} · Mã vận đơn{" "}
            <span className="font-mono text-foreground">{shipment.trackingCode}</span>
          </p>
          {shipment.estimatedDeliveryAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dự kiến giao: {formatCommerceDate(shipment.estimatedDeliveryAt, false)}
            </p>
          )}
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có sự kiện vận chuyển.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border/70 pl-5" aria-label="Lịch sử vận chuyển">
          {events.map((event, index) => {
            const latest = index === 0;
            const delivered = event.status === "DELIVERED";
            const Icon = delivered ? PackageCheck : latest ? CheckCircle2 : Circle;
            return (
              <li key={`${event.status}-${event.occurredAt}-${index}`} className="relative">
                <span
                  className={cn(
                    "absolute -left-[1.85rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background",
                    latest ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className={cn("text-sm", latest ? "font-semibold text-foreground" : "text-foreground/80")}>
                  {shipmentStatusLabel(event.status)}
                </p>
                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatCommerceDate(event.occurredAt)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
