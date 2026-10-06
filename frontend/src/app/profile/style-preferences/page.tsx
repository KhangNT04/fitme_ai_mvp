"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { LoginRequiredNotice } from "@/components/common/LoginRequiredNotice";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui/button";
import { useRequireLogin } from "@/hooks/use-require-login";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage, isPremiumRequiredError } from "@/lib/user-error-message";
import { PREMIUM_PERKS, PREMIUM_PLAN_NAME, premiumUpgradeCta } from "@/lib/premium";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { publicBrandApi } from "@/services/brand-api";
import { entitlementApi } from "@/services/entitlement-api";
import {
  BRAND_MIX_MODE_OPTIONS,
  BRAND_PREFERENCES_QUERY_KEY,
  MAX_FAVORITE_BRANDS,
  brandPreferenceApi,
  toggleFavoriteBrand,
  validateBrandPreferences,
  type BrandMixMode,
  type BrandPreferences,
} from "@/services/brand-preference-api";

export default function StylePreferencesPage() {
  return (
    <PageSuspense>
      <StylePreferencesContent />
    </PageSuspense>
  );
}

function StylePreferencesContent() {
  const { ready, authed } = useRequireLogin();

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Brand yêu thích"
        subtitle="Tùy biến cách stylist AI phối đồ theo brand bạn thích"
        backHref="/profile"
        backLabel="Hồ sơ"
        showMobileBack
      />
      {!ready ? (
        <LoadingSkeleton type="card" count={1} />
      ) : !authed ? (
        <LoginRequiredNotice next="/profile/style-preferences" />
      ) : (
        <BrandPreferencesSection />
      )}
    </PageShell>
  );
}

function BrandPreferencesSection() {
  const prefsQuery = useQuery({
    queryKey: BRAND_PREFERENCES_QUERY_KEY,
    queryFn: () => brandPreferenceApi.get(),
  });
  const entitlementQuery = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.get(),
    staleTime: 60_000,
  });

  if (prefsQuery.isLoading) return <LoadingSkeleton type="card" count={2} />;
  if (prefsQuery.error || !prefsQuery.data) return <ErrorState onRetry={() => void prefsQuery.refetch()} />;

  const prefs = prefsQuery.data;
  const premium = prefs.premium || Boolean(entitlementQuery.data?.premium);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!premium && <PremiumLockedCard priceVnd={entitlementQuery.data?.premiumPriceVnd} />}
      <BrandPreferencesForm
        key={`${prefs.mode}:${prefs.brandIds.join(",")}`}
        initial={prefs}
        locked={!premium}
      />
    </div>
  );
}

function PremiumLockedCard({ priceVnd }: { priceVnd?: number | null }) {
  return (
    <section
      className="surface-card space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-5"
      data-testid="brand-preferences-upsell"
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold">Tính năng của {PREMIUM_PLAN_NAME}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Chọn brand yêu thích để stylist AI ưu tiên hoặc chỉ phối đồ từ những brand đó.
      </p>
      <ul className="space-y-1 text-sm">
        {PREMIUM_PERKS.map((perk) => (
          <li key={perk} className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {perk}
          </li>
        ))}
      </ul>
      <Button asChild className="rounded-full">
        <Link href="/pricing">{premiumUpgradeCta(priceVnd)}</Link>
      </Button>
    </section>
  );
}

function BrandPreferencesForm({ initial, locked }: { initial: BrandPreferences; locked: boolean }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<BrandMixMode>(initial.mode);
  const [brandIds, setBrandIds] = useState<string[]>(initial.brandIds);
  const [error, setError] = useState<string | null>(null);

  const brandsQuery = useQuery({
    queryKey: ["public-brands"],
    queryFn: () => publicBrandApi.list(),
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: () => brandPreferenceApi.update({ mode, brandIds }),
    onSuccess: (updated) => {
      queryClient.setQueryData(BRAND_PREFERENCES_QUERY_KEY, updated);
      toast.success("Đã lưu brand yêu thích");
    },
    onError: (err) => {
      const message = getUserErrorMessage(err, "Không lưu được brand yêu thích");
      setError(message);
      if (isPremiumRequiredError(err)) {
        void queryClient.invalidateQueries({ queryKey: ["consumer-entitlement"] });
      }
      toast.error(message);
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateBrandPreferences({ mode, brandIds });
    setError(validation);
    if (!validation) save.mutate();
  };

  const brands = brandsQuery.data ?? [];
  const atLimit = brandIds.length >= MAX_FAVORITE_BRANDS;

  return (
    <form
      onSubmit={submit}
      className={cn("surface-card space-y-5 rounded-2xl p-5 sm:p-6", locked && "opacity-60")}
    >
      <fieldset disabled={locked} className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Cách phối đồ</legend>
        {BRAND_MIX_MODE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
              mode === option.value ? "border-primary bg-primary/5" : "border-border/60",
              locked && "cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="brand-mix-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => {
                setMode(option.value);
                setError(null);
              }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset disabled={locked} className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">
          Brand yêu thích ({brandIds.length}/{MAX_FAVORITE_BRANDS})
        </legend>
        {brandsQuery.isLoading ? (
          <LoadingSkeleton type="list" count={1} />
        ) : brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có brand nào để chọn.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brands.map((brand) => {
              const selected = brandIds.includes(brand.id);
              const disabled = locked || (!selected && atLimit);
              return (
                <button
                  key={brand.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => {
                    setBrandIds((current) => toggleFavoriteBrand(current, brand.id));
                    setError(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
                  )}
                >
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {brand.logoUrl ? (
                      <AppImage src={brand.logoUrl} alt="" fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{brand.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full rounded-full" disabled={locked || save.isPending}>
        {save.isPending ? "Đang lưu..." : "Lưu brand yêu thích"}
      </Button>
    </form>
  );
}
