"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { CartLineItem } from "@/components/commerce/CartLineItem";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { PriceBreakdown } from "@/components/commerce/PriceBreakdown";
import { useRequireLogin } from "@/hooks/use-require-login";
import { useCartQuery } from "@/hooks/use-cart";
import { availableCartItems, sumCartSubtotal, unavailableCartItems } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cartApi, CART_QUERY_KEY } from "@/services/cart-api";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format-price";
import type { Cart, CartItem } from "@/types/commerce";

export default function CartPage() {
  return (
    <PageSuspense>
      <CartContent />
    </PageSuspense>
  );
}

function CartContent() {
  const queryClient = useQueryClient();
  const { ready, authed } = useRequireLogin();
  const { data: cart, isLoading, error, refetch } = useCartQuery(ready && authed);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });

  const changeQuantity = useMutation({
    mutationFn: ({ item, quantity }: { item: CartItem; quantity: number }) =>
      cartApi.updateItem(item.id, quantity),
    onMutate: ({ item }) => setBusyId(item.id),
    onSuccess: (next: Cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, next);
      void refresh();
    },
    onError: (e) => {
      toast.error(getCommerceErrorMessage(e, "Không cập nhật được số lượng"));
      void refresh();
    },
    onSettled: () => setBusyId(null),
  });

  const removeItem = useMutation({
    mutationFn: (item: CartItem) => cartApi.removeItem(item.id),
    onMutate: (item) => setBusyId(item.id),
    onSuccess: () => {
      toast.success("Đã xóa khỏi giỏ hàng");
      void refresh();
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không xóa được sản phẩm")),
    onSettled: () => setBusyId(null),
  });

  const removeUnavailable = useMutation({
    mutationFn: async (items: CartItem[]) => {
      for (const item of items) await cartApi.removeItem(item.id);
    },
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm hết hàng");
      void refresh();
    },
    onError: (e) => {
      toast.error(getCommerceErrorMessage(e, "Không xóa được sản phẩm"));
      void refresh();
    },
  });

  const header = (
    <CollapsingPageHeader
      title="Giỏ hàng"
      subtitle={cart && cart.itemCount > 0 ? `${cart.itemCount} sản phẩm` : undefined}
      backHref="/discover"
      backLabel="Khám phá"
      showMobileBack
    />
  );

  if (!ready || (authed && isLoading)) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoadingSkeleton type="list" count={3} />
      </PageShell>
    );
  }

  if (!authed) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoginRequiredNotice next="/cart" message="Đăng nhập để xem giỏ hàng của bạn" />
      </PageShell>
    );
  }

  if (error || !cart) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  if (cart.groups.length === 0 || cart.itemCount === 0) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center" data-testid="cart-empty">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 text-sm font-medium">Giỏ hàng của bạn đang trống</p>
          <p className="mt-1 text-xs text-muted-foreground">Khám phá sản phẩm và thêm vào giỏ để đặt hàng ngay.</p>
          <Button asChild className="mt-4 rounded-full" size="sm">
            <Link href="/discover">Khám phá sản phẩm</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const available = availableCartItems(cart);
  const unavailable = unavailableCartItems(cart);
  const payableSubtotal = sumCartSubtotal(available);
  const canCheckout = available.length > 0;
  const brandCount = new Set(
    cart.groups.filter((g) => g.items.some((i) => i.available)).map((g) => g.brandId),
  ).size;

  return (
    <PageShell width="full" className={cn(consumerPageShellClass, "pb-28 md:pb-8")}>
      {header}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {unavailable.length > 0 && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <span>
                {unavailable.length} sản phẩm không đủ hàng sẽ không được tính vào đơn.
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={removeUnavailable.isPending}
                onClick={() => removeUnavailable.mutate(unavailable.filter((i) => i.stockQuantity <= 0))}
              >
                Xóa sản phẩm hết hàng
              </Button>
            </div>
          )}

          {cart.groups.map((group) => (
            <section key={group.brandId} className="surface-card rounded-2xl p-4 sm:p-5" data-testid="cart-group">
              <header className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <Link href={`/discover/brand/${group.brandId}`} className="text-sm font-semibold hover:underline">
                  {group.brandName}
                </Link>
                <span className="text-xs text-muted-foreground">Tạm tính {formatPrice(group.subtotalVnd)}</span>
              </header>
              <ul className="divide-y divide-border/40">
                {group.items.map((item) => (
                  <CartLineItem
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onQuantityChange={(it, quantity) => changeQuantity.mutate({ item: it, quantity })}
                    onRemove={(it) => removeItem.mutate(it)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Desktop summary */}
        <aside className="hidden lg:block">
          <div className="surface-card sticky top-24 space-y-4 rounded-2xl p-5">
            <h2 className="text-base font-semibold">Tóm tắt đơn hàng</h2>
            <PriceBreakdown
              subtotalVnd={payableSubtotal}
              totalVnd={payableSubtotal}
              shippingNote={
                brandCount > 1 ? `Tính ở bước thanh toán (${brandCount} shop)` : "Tính ở bước thanh toán"
              }
            />
            <Button asChild={canCheckout} className="w-full" size="lg" disabled={!canCheckout}>
              {canCheckout ? <Link href="/checkout">Tiến hành thanh toán</Link> : <span>Tiến hành thanh toán</span>}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile sticky checkout bar (sits above the bottom nav) */}
      <div
        className="fixed inset-x-0 bottom-[calc(var(--mobile-nav-height,4rem)+env(safe-area-inset-bottom,0px))] z-40 border-t border-border/60 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur md:bottom-0 lg:hidden"
        data-testid="cart-checkout-bar"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Tạm tính ({available.length} dòng)</p>
            <p className="font-display text-lg font-bold tabular-nums">{formatPrice(payableSubtotal)}</p>
          </div>
          <Button asChild={canCheckout} disabled={!canCheckout} className="rounded-full px-6">
            {canCheckout ? <Link href="/checkout">Thanh toán</Link> : <span>Thanh toán</span>}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
