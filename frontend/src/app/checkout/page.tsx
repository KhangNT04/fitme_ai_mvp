"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Plus, Ticket } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressForm } from "@/components/commerce/AddressForm";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { PriceBreakdown } from "@/components/commerce/PriceBreakdown";
import { ProductThumb } from "@/components/commerce/ProductThumb";
import { useRequireLogin } from "@/hooks/use-require-login";
import { useCartQuery } from "@/hooks/use-cart";
import {
  availableCartItems,
  cartItemVariantLabel,
  formatAddressLine,
  formatCommerceDate,
  pickDefaultAddress,
  resolveCheckoutTarget,
} from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { getApiErrorCode } from "@/services/api-client";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { addressApi, ADDRESSES_QUERY_KEY } from "@/services/address-api";
import { CART_QUERY_KEY } from "@/services/cart-api";
import { orderApi, ORDERS_QUERY_KEY } from "@/services/order-api";
import { toast } from "@/stores/toast-store";
import { formatPrice } from "@/utils/format-price";
import type { AddressInput, PaymentMethod } from "@/types/commerce";

export default function CheckoutPage() {
  return (
    <PageSuspense>
      <CheckoutContent />
    </PageSuspense>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface-card space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RadioCard({
  checked,
  onSelect,
  children,
  name,
  testId,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  name: string;
  testId?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
        checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
      )}
      data-testid={testId}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready, authed } = useRequireLogin();
  const enabled = ready && authed;

  const cartQuery = useCartQuery(enabled);
  const addressesQuery = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => addressApi.list(),
    enabled,
  });
  const vouchersQuery = useQuery({
    queryKey: ["freeship-vouchers"],
    queryFn: () => orderApi.listFreeshipVouchers(),
    enabled,
    retry: false,
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [note, setNote] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);

  const addresses = addressesQuery.data;
  const effectiveAddressId =
    (selectedAddressId && addresses?.some((a) => a.id === selectedAddressId) ? selectedAddressId : null) ??
    pickDefaultAddress(addresses)?.id ??
    null;

  const checkoutItems = useMemo(() => availableCartItems(cartQuery.data), [cartQuery.data]);
  const cartItemIds = useMemo(() => checkoutItems.map((i) => i.id), [checkoutItems]);
  const totalLines = cartQuery.data?.groups.reduce((n, g) => n + g.items.length, 0) ?? 0;
  const hasUnavailable = checkoutItems.length < totalLines;

  const previewQuery = useQuery({
    queryKey: ["order-preview", effectiveAddressId, voucherId, cartItemIds.join(",")],
    queryFn: () =>
      orderApi.preview({ addressId: effectiveAddressId, voucherId, cartItemIds }),
    enabled: enabled && cartItemIds.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const preview = previewQuery.data;

  const createAddress = useMutation({
    mutationFn: (input: AddressInput) => addressApi.create(input),
    onSuccess: (address) => {
      void queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      setSelectedAddressId(address.id);
      setShowNewAddress(false);
      toast.success("Đã lưu địa chỉ");
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không lưu được địa chỉ")),
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      orderApi.place({
        addressId: effectiveAddressId!,
        paymentMethod,
        voucherId,
        cartItemIds,
        note: note.trim() || undefined,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["freeship-vouchers"] });
      const target = paymentMethod === "PAYOS" ? resolveCheckoutTarget(result.checkoutUrl) : null;
      if (target?.kind === "internal") {
        router.push(target.url);
      } else if (target?.kind === "external") {
        window.location.assign(target.url);
      } else {
        toast.success("Đặt hàng thành công");
        router.push(`/orders/${result.order.id}`);
      }
    },
    onError: (e) => {
      const code = getApiErrorCode(e);
      toast.error(getCommerceErrorMessage(e, "Không đặt được hàng. Vui lòng thử lại."));
      if (code === "OUT_OF_STOCK" || code === "CART_EMPTY") {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        if (code === "CART_EMPTY") router.replace("/cart");
      }
    },
  });

  const header = (
    <CollapsingPageHeader
      title="Thanh toán"
      subtitle="Kiểm tra địa chỉ, voucher và phương thức thanh toán"
      backHref="/cart"
      backLabel="Giỏ hàng"
      showMobileBack
    />
  );

  if (!ready || (authed && (cartQuery.isLoading || addressesQuery.isLoading))) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoadingSkeleton type="list" count={4} />
      </PageShell>
    );
  }

  if (!authed) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoginRequiredNotice next="/checkout" message="Đăng nhập để thanh toán" />
      </PageShell>
    );
  }

  if (cartQuery.error || addressesQuery.error) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <ErrorState
          onRetry={() => {
            void cartQuery.refetch();
            void addressesQuery.refetch();
          }}
        />
      </PageShell>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center" data-testid="checkout-empty">
          <p className="text-sm font-medium">Không có sản phẩm nào để thanh toán</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Giỏ hàng trống hoặc các sản phẩm đã hết hàng.
          </p>
          <Button asChild className="mt-4 rounded-full" size="sm">
            <Link href="/cart">Về giỏ hàng</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const vouchers = vouchersQuery.data ?? [];
  const noAddress = !addresses || addresses.length === 0;
  const addressFormVisible = noAddress || showNewAddress;
  const canPlace = !!effectiveAddressId && !!preview && !previewQuery.isError && !placeOrder.isPending && !addressFormVisible;
  const previewErrorMessage = previewQuery.isError
    ? getCommerceErrorMessage(previewQuery.error, "Không tính được giá đơn hàng")
    : null;

  return (
    <PageShell width="full" className={cn(consumerPageShellClass, "pb-28 md:pb-8")}>
      {header}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {/* Address */}
          <SectionCard
            title="Địa chỉ giao hàng"
            action={
              !noAddress && !showNewAddress ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowNewAddress(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Thêm địa chỉ
                </Button>
              ) : null
            }
          >
            {!noAddress && (
              <div className="space-y-2" role="radiogroup" aria-label="Chọn địa chỉ">
                {addresses!.map((a) => (
                  <RadioCard
                    key={a.id}
                    name="address"
                    checked={a.id === effectiveAddressId}
                    onSelect={() => setSelectedAddressId(a.id)}
                    testId="checkout-address"
                  >
                    <p className="font-medium">
                      {a.recipientName} · {a.phone}
                      {a.isDefault && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Mặc định
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">{formatAddressLine(a)}</p>
                  </RadioCard>
                ))}
              </div>
            )}

            {addressFormVisible && (
              <div className={cn(!noAddress && "rounded-xl border border-border/60 bg-muted/20 p-4")}>
                <p className="mb-3 text-sm font-medium">
                  {noAddress ? "Bạn chưa có địa chỉ — thêm địa chỉ nhận hàng" : "Địa chỉ mới"}
                </p>
                <AddressForm
                  idPrefix="checkout-addr"
                  submitting={createAddress.isPending}
                  hideDefault={noAddress}
                  initial={noAddress ? { isDefault: true } : undefined}
                  submitLabel="Lưu & dùng địa chỉ này"
                  onSubmit={(input) => createAddress.mutate(input)}
                  onCancel={noAddress ? undefined : () => setShowNewAddress(false)}
                />
              </div>
            )}
          </SectionCard>

          {/* Items */}
          <SectionCard title="Sản phẩm">
            <div className="space-y-4">
              {(preview?.groups ?? []).map((group) => (
                <div key={group.brandId} className="rounded-xl border border-border/50 p-3">
                  <p className="text-sm font-semibold">{group.brandName}</p>
                  <ul className="divide-y divide-border/40">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex gap-3 py-3">
                        <ProductThumb src={item.imageUrl} alt={item.name} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{cartItemVariantLabel(item)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPrice(item.unitPriceVnd)} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">{formatPrice(item.lineTotalVnd)}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    Phí ship {formatPrice(group.shippingFeeVnd)}
                  </p>
                </div>
              ))}
              {!preview && previewQuery.isLoading && <LoadingSkeleton type="list" count={2} />}
              {hasUnavailable && (
                <p className="text-xs text-amber-700">
                  Một số sản phẩm hết hàng trong giỏ sẽ không được đặt.{" "}
                  <Link href="/cart" className="underline">
                    Xem giỏ hàng
                  </Link>
                </p>
              )}
            </div>
          </SectionCard>

          {/* Voucher */}
          <SectionCard title="Voucher miễn phí vận chuyển">
            {vouchersQuery.isLoading ? (
              <LoadingSkeleton type="list" count={1} />
            ) : vouchers.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ticket className="h-4 w-4" aria-hidden />
                Bạn chưa có voucher freeship.{" "}
                <Link href="/pricing" className="text-primary underline">
                  Nâng cấp FitMe Pro
                </Link>
              </p>
            ) : (
              <div className="space-y-2" role="radiogroup" aria-label="Chọn voucher">
                <RadioCard name="voucher" checked={voucherId === null} onSelect={() => setVoucherId(null)}>
                  <p>Không dùng voucher</p>
                </RadioCard>
                {vouchers.map((v) => {
                  const checked = voucherId === v.id;
                  return (
                    <RadioCard
                      key={v.id}
                      name="voucher"
                      checked={checked}
                      onSelect={() => setVoucherId(v.id)}
                      testId="checkout-voucher"
                    >
                      <p className="font-medium">
                        Freeship — giảm tối đa {formatPrice(v.maxDiscountVnd)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.expiresAt ? `HSD ${formatCommerceDate(v.expiresAt, false)}` : "Không giới hạn thời gian"}
                        {checked && preview && preview.discountVnd > 0
                          ? ` · Giảm ${formatPrice(preview.discountVnd)} cho đơn này`
                          : ""}
                      </p>
                    </RadioCard>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Payment */}
          <SectionCard title="Phương thức thanh toán">
            <div className="space-y-2" role="radiogroup" aria-label="Phương thức thanh toán">
              <RadioCard
                name="payment"
                checked={paymentMethod === "COD"}
                onSelect={() => setPaymentMethod("COD")}
                testId="payment-cod"
              >
                <p className="flex items-center gap-2 font-medium">
                  <Banknote className="h-4 w-4" aria-hidden />
                  Thanh toán khi nhận hàng (COD)
                </p>
                <p className="text-xs text-muted-foreground">Đơn được xác nhận ngay, thanh toán khi giao thành công.</p>
              </RadioCard>
              <RadioCard
                name="payment"
                checked={paymentMethod === "PAYOS"}
                onSelect={() => setPaymentMethod("PAYOS")}
                testId="payment-payos"
              >
                <p className="flex items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  Chuyển khoản / thẻ qua PayOS
                </p>
                <p className="text-xs text-muted-foreground">
                  Bạn sẽ được chuyển sang cổng thanh toán. Đơn chưa thanh toán sẽ tự hủy sau một thời gian.
                </p>
              </RadioCard>
            </div>
            <div>
              <Label htmlFor="checkout-note">Ghi chú cho người bán (không bắt buộc)</Label>
              <Input
                id="checkout-note"
                className="mt-1"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: giao giờ hành chính"
              />
            </div>
          </SectionCard>
        </div>

        {/* Summary */}
        <aside>
          <div className="surface-card space-y-4 rounded-2xl p-5 lg:sticky lg:top-24">
            <h2 className="text-base font-semibold">Chi tiết thanh toán</h2>
            {preview ? (
              <PriceBreakdown
                subtotalVnd={preview.subtotalVnd}
                shippingFeeVnd={preview.shippingFeeVnd}
                discountVnd={preview.discountVnd}
                totalVnd={preview.totalVnd}
              />
            ) : (
              <LoadingSkeleton type="list" count={3} />
            )}
            {previewErrorMessage && (
              <p role="alert" className="text-sm text-red-600">
                {previewErrorMessage}{" "}
                {voucherId && (
                  <button type="button" className="underline" onClick={() => setVoucherId(null)}>
                    Bỏ voucher
                  </button>
                )}
              </p>
            )}
            {!effectiveAddressId && !addressFormVisible && (
              <p className="text-sm text-amber-700">Vui lòng chọn địa chỉ giao hàng.</p>
            )}
            <Button
              type="button"
              size="lg"
              className="hidden w-full lg:inline-flex"
              disabled={!canPlace}
              onClick={() => placeOrder.mutate()}
              data-testid="place-order"
            >
              {placeOrder.isPending
                ? "Đang đặt hàng..."
                : paymentMethod === "PAYOS"
                  ? "Đặt hàng & thanh toán"
                  : "Đặt hàng"}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile sticky place-order bar */}
      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-nav-height,4rem)+env(safe-area-inset-bottom,0px))] z-40 border-t border-border/60 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Tổng cộng</p>
            <p className="font-display text-lg font-bold tabular-nums">{formatPrice(preview?.totalVnd ?? 0)}</p>
          </div>
          <Button
            type="button"
            className="rounded-full px-6"
            disabled={!canPlace}
            onClick={() => placeOrder.mutate()}
            data-testid="place-order-mobile"
          >
            {placeOrder.isPending ? "Đang đặt..." : "Đặt hàng"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
