"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PackagePlus, Send, Truck, XCircle } from "lucide-react";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
import { PortalFormCard } from "@/components/portal/PortalFormCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReasonDialog } from "@/components/commerce/ReasonDialog";
import { ShipmentTimeline } from "@/components/commerce/ShipmentTimeline";
import { CARRIER_OPTIONS, shipmentStatusLabel } from "@/lib/commerce-labels";
import { SHIPMENT_EVENT_OPTIONS, sellerAvailableActions } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { getApiErrorCode } from "@/services/api-client";
import { sellerOrderApi } from "@/services/seller-order-api";
import { toast } from "@/stores/toast-store";
import type { Carrier, SellerOrder, ShipmentStatus } from "@/types/commerce";

interface SellerOrderActionsProps {
  /** Seller order id (the same id used in /brand/orders/{id}). */
  sellerOrder: Pick<SellerOrder, "id" | "status" | "shipment">;
  /** Called after any successful transition so the page can refetch. */
  onChanged: () => void;
}

function ShipForm({
  loading,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  onSubmit: (carrier: Carrier, trackingCode: string) => void;
  onCancel: () => void;
}) {
  const [carrier, setCarrier] = useState<Carrier>("GHN");
  const [trackingCode, setTrackingCode] = useState("");
  return (
    <PortalFormCard>
      <h3 className="text-sm font-semibold">Bàn giao vận chuyển</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Đơn vị vận chuyển</Label>
          <Select value={carrier} onValueChange={(v) => setCarrier(v as Carrier)}>
            <SelectTrigger className="mt-1" aria-label="Đơn vị vận chuyển">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="tracking-code">Mã vận đơn (không bắt buộc)</Label>
          <Input
            id="tracking-code"
            className="mt-1"
            value={trackingCode}
            placeholder="Để trống để hệ thống tự sinh"
            onChange={(e) => setTrackingCode(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} onClick={() => onSubmit(carrier, trackingCode)}>
          <Send className="mr-1.5 h-4 w-4" />
          {loading ? "Đang xử lý..." : "Xác nhận giao hàng"}
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </PortalFormCard>
  );
}

function ShipmentEventForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: { status: ShipmentStatus; description?: string; location?: string }) => void;
}) {
  const [status, setStatus] = useState<ShipmentStatus>("PICKED_UP");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  return (
    <PortalFormCard>
      <h3 className="text-sm font-semibold">Cập nhật hành trình</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Trạng thái vận đơn</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
            <SelectTrigger className="mt-1" aria-label="Trạng thái vận đơn">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIPMENT_EVENT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {shipmentStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="event-desc">Mô tả</Label>
          <Input
            id="event-desc"
            className="mt-1"
            value={description}
            placeholder="Ví dụ: Đã đến kho phân loại"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="event-location">Vị trí</Label>
          <Input
            id="event-location"
            className="mt-1"
            value={location}
            placeholder="Ví dụ: Kho Bình Tân"
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        disabled={loading}
        onClick={() =>
          onSubmit({
            status,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
          })
        }
      >
        <Truck className="mr-1.5 h-4 w-4" />
        {loading ? "Đang lưu..." : "Thêm sự kiện"}
      </Button>
    </PortalFormCard>
  );
}

/** Status transition controls + shipment management for a seller order. */
export function SellerOrderActions({ sellerOrder, onChanged }: SellerOrderActionsProps) {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const actions = sellerAvailableActions(sellerOrder.status);
  const { shipment } = sellerOrder;

  const handleError = (fallback: string) => (e: unknown) => {
    toast.error(getCommerceErrorMessage(e, fallback));
    if (getApiErrorCode(e) === "INVALID_STATUS_TRANSITION") onChanged();
  };
  const done = (message: string) => () => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
    onChanged();
  };

  const confirm = useMutation({
    mutationFn: () => sellerOrderApi.confirm(sellerOrder.id),
    onSuccess: done("Đã xác nhận đơn hàng"),
    onError: handleError("Không xác nhận được đơn hàng"),
  });
  const pack = useMutation({
    mutationFn: () => sellerOrderApi.pack(sellerOrder.id),
    onSuccess: done("Đã đóng gói đơn hàng"),
    onError: handleError("Không cập nhật được đơn hàng"),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => sellerOrderApi.cancel(sellerOrder.id, reason),
    onSuccess: () => {
      setCancelOpen(false);
      done("Đã hủy đơn hàng")();
    },
    onError: handleError("Không hủy được đơn hàng"),
  });
  const ship = useMutation({
    mutationFn: ({ carrier, trackingCode }: { carrier: Carrier; trackingCode: string }) =>
      sellerOrderApi.ship(sellerOrder.id, { carrier, trackingCode }),
    onSuccess: () => {
      setShipOpen(false);
      done("Đơn hàng đã được bàn giao vận chuyển")();
    },
    onError: handleError("Không tạo được vận đơn"),
  });
  const addEvent = useMutation({
    mutationFn: (payload: { status: ShipmentStatus; description?: string; location?: string }) =>
      sellerOrderApi.addShipmentEvent(shipment!.id, payload),
    onSuccess: done("Đã cập nhật hành trình"),
    onError: handleError("Không cập nhật được vận đơn"),
  });

  const busy = confirm.isPending || pack.isPending || cancel.isPending || ship.isPending;
  const canAddEvent =
    !!shipment?.id && sellerOrder.status === "SHIPPING" && shipment.status !== "DELIVERED";

  return (
    <div className="space-y-4" data-testid="seller-order-actions">
      {actions.length > 0 && (
        <PortalActionGroup>
          {actions.includes("confirm") && (
            <PortalActionButton variant="approve" loading={confirm.isPending} disabled={busy} onClick={() => confirm.mutate()}>
              Xác nhận đơn
            </PortalActionButton>
          )}
          {actions.includes("pack") && (
            <PortalActionButton variant="resolve" hideIcon loading={pack.isPending} disabled={busy} onClick={() => pack.mutate()}>
              <PackageCheck className="h-3.5 w-3.5" aria-hidden />
              Đã đóng gói
            </PortalActionButton>
          )}
          {actions.includes("ship") && !shipOpen && (
            <PortalActionButton variant="submit" hideIcon disabled={busy} onClick={() => setShipOpen(true)}>
              <PackagePlus className="h-3.5 w-3.5" aria-hidden />
              Giao cho vận chuyển
            </PortalActionButton>
          )}
          {actions.includes("cancel") && (
            <PortalActionButton variant="delete" hideIcon disabled={busy} onClick={() => setCancelOpen(true)}>
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              Hủy đơn
            </PortalActionButton>
          )}
        </PortalActionGroup>
      )}

      {shipOpen && (
        <ShipForm
          loading={ship.isPending}
          onSubmit={(carrier, trackingCode) => ship.mutate({ carrier, trackingCode })}
          onCancel={() => setShipOpen(false)}
        />
      )}

      {shipment && <ShipmentTimeline shipment={shipment} />}
      {canAddEvent && <ShipmentEventForm loading={addEvent.isPending} onSubmit={(p) => addEvent.mutate(p)} />}

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn của shop?"
        description="Sản phẩm sẽ được hoàn lại kho. Khách hàng sẽ thấy đơn của shop bị hủy."
        label="Lý do hủy"
        placeholder="Ví dụ: hết hàng, không liên lạc được khách"
        required
        destructive
        confirmLabel="Hủy đơn"
        loading={cancel.isPending}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
    </div>
  );
}
