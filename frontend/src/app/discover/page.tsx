"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import {
  DISCOVER_SEARCH_FOCUS_EVENT,
  DISCOVER_SEARCH_HASH,
  focusDiscoverSearchInput,
  isDiscoverSearchInputVisible,
  openDiscoverSearch,
} from "@/lib/discover-search";
import { categoryFilterLabel, filterProductsByCategory } from "@/lib/product-category";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import type { Brand } from "@/types/brand";

const ALL_BRANDS = "all";
const ALL_CATEGORIES = "all";

function groupProductsByBrand(items: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>();
  for (const product of items) {
    const existing = groups.get(product.brandId);
    if (existing) {
      existing.push(product);
    } else {
      groups.set(product.brandId, [product]);
    }
  }
  return groups;
}

function BrandSectionHeader({ brand, count }: { brand?: Brand; count: number }) {
  const name = brand?.name ?? "Thương hiệu";
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-1.5 sm:mb-2.5 sm:gap-2.5 sm:pb-2">
      {brand?.logoUrl ? (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border/50 bg-white">
          <Image src={brand.logoUrl} alt="" fill className="object-cover" sizes="40px" unoptimized />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-bold text-foreground">{name}</h2>
        <p className="text-xs text-muted-foreground">{count} sản phẩm</p>
      </div>
    </div>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={catalogProductGridClass}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} size="catalog" />
      ))}
    </div>
  );
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [brandId, setBrandId] = useState(ALL_BRANDS);
  const [aiOnly, setAiOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearchField = useCallback(() => {
    const candidates = [
      searchRef.current,
      ...document.querySelectorAll<HTMLInputElement>("[data-discover-search]"),
    ].filter(Boolean) as HTMLInputElement[];

    for (const input of candidates) {
      if (isDiscoverSearchInputVisible(input)) {
        input.focus({ preventScroll: true });
        if (document.activeElement === input) return true;
      }
    }
    return focusDiscoverSearchInput();
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public"],
    queryFn: () => publicBrandApi.list(),
  });

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ["products", search, brandId, aiOnly],
    queryFn: () =>
      productApi.list({
        search: search || undefined,
        brandId: brandId !== ALL_BRANDS ? brandId : undefined,
        aiTryOnEligible: aiOnly || undefined,
      }),
  });

  const data = useMemo(() => {
    if (!rawData) return rawData;
    const items = filterProductsByCategory(rawData.items, category, ALL_CATEGORIES);
    if (items.length === rawData.items.length) return rawData;
    return { ...rawData, items, total: items.length };
  }, [rawData, category]);

  const groupedByBrand = useMemo(() => {
    if (!data?.items.length || brandId !== ALL_BRANDS) return null;
    return groupProductsByBrand(data.items);
  }, [data?.items, brandId]);

  const sortedBrandGroups = useMemo(() => {
    if (!groupedByBrand) return [];
    return [...groupedByBrand.entries()].sort((a, b) => {
      const nameA = brandMap.get(a[0])?.name ?? a[1][0]?.brandName ?? "";
      const nameB = brandMap.get(b[0])?.name ?? b[1][0]?.brandName ?? "";
      return nameA.localeCompare(nameB, "vi");
    });
  }, [groupedByBrand, brandMap]);

  useEffect(() => {
    const activateSearch = () => {
      if (window.location.hash !== DISCOVER_SEARCH_HASH) return;
      openDiscoverSearch();
    };

    const onFocusRequest = () => {
      focusSearchField();
      window.setTimeout(focusSearchField, 200);
      window.setTimeout(focusSearchField, 450);
      window.setTimeout(focusSearchField, 750);
    };

    activateSearch();
    window.addEventListener("hashchange", activateSearch);
    window.addEventListener(DISCOVER_SEARCH_FOCUS_EVENT, onFocusRequest);
    return () => {
      window.removeEventListener("hashchange", activateSearch);
      window.removeEventListener(DISCOVER_SEARCH_FOCUS_EVENT, onFocusRequest);
    };
  }, [focusSearchField]);

  const hasActiveFilters = brandId !== ALL_BRANDS || category !== ALL_CATEGORIES || aiOnly;

  const clearFilters = () => {
    setSearch("");
    setBrandId(ALL_BRANDS);
    setCategory(ALL_CATEGORIES);
    setAiOnly(false);
  };

  const filterDialog = (iconOnly: boolean) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "relative shrink-0 rounded-full",
            iconOnly ? "h-8 w-8 px-0 sm:h-9 sm:w-9" : "h-11 w-full gap-2 sm:h-9 sm:w-auto sm:px-4",
          )}
          aria-label="Bộ lọc"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {!iconOnly && <span className="sm:inline">Bộ lọc</span>}
          {hasActiveFilters && (
            <span
              className={cn(
                "rounded-full bg-primary",
                iconOnly ? "absolute right-1 top-1 h-2 w-2" : "ml-1 h-2 w-2",
              )}
              aria-label="Đang lọc"
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bộ lọc sản phẩm</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Thương hiệu</label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Thương hiệu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANDS}>Tất cả thương hiệu</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Danh mục</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Tất cả</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={aiOnly ? "default" : "outline"}
            className="h-11 w-full rounded-xl"
            onClick={() => setAiOnly(!aiOnly)}
          >
            Chỉ sản phẩm thử AI
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" className="h-11 w-full rounded-xl" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Khám phá sản phẩm"
        subtitle="Lọc theo thương hiệu, tìm sản phẩm phù hợp và tư vấn size bằng AI."
        backHref="/"
        backLabel="Trang chủ"
        trailing={
          <>
            <span id="discover-search" className="sr-only" aria-hidden="true" />
            <Input
              ref={searchRef}
              data-discover-search
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-full border-border/60 bg-white px-2.5 text-xs sm:h-9 sm:w-36 sm:flex-none sm:px-3 sm:text-sm"
            />
            <div className="hidden items-center gap-1 sm:flex">
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger className="h-8 w-auto min-w-[9.25rem] max-w-[11rem] shrink-0 rounded-full border-border/60 bg-white px-2.5 text-xs whitespace-nowrap sm:h-9 sm:min-w-[10.5rem] sm:px-3 sm:text-sm [&>span]:line-clamp-1 [&>span]:truncate">
                  <SelectValue placeholder="Thương hiệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BRANDS}>Tất cả thương hiệu</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 min-w-[6.5rem] rounded-full border-border/60 bg-white px-2.5 text-xs sm:h-9 sm:min-w-[7.5rem] sm:text-sm">
                  <SelectValue placeholder="Danh mục">
                    {categoryFilterLabel(category, ALL_CATEGORIES)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>Tất cả</SelectItem>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={aiOnly ? "default" : "outline"}
                className="h-8 rounded-full px-2.5 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
                onClick={() => setAiOnly(!aiOnly)}
              >
                Thử AI
              </Button>
            </div>
            <div className="sm:hidden">{filterDialog(true)}</div>
          </>
        }
      />

      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Đang lọc:</span>
          {category !== ALL_CATEGORIES && (
            <Badge variant="secondary">{categoryFilterLabel(category, ALL_CATEGORIES)}</Badge>
          )}
          {brandId !== ALL_BRANDS && (
            <Badge variant="secondary">{brandMap.get(brandId)?.name ?? "Thương hiệu"}</Badge>
          )}
          {aiOnly && <Badge variant="secondary">Thử AI</Badge>}
          {search.trim() && <Badge variant="secondary">&quot;{search.trim()}&quot;</Badge>}
          <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={clearFilters}>
            Xóa tất cả
          </Button>
        </div>
      )}

      <div>
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        )}
        {sortedBrandGroups.length > 0 && (
          <div className="space-y-10">
            {sortedBrandGroups.map(([id, products]) => (
              <section key={id}>
                <BrandSectionHeader brand={brandMap.get(id)} count={products.length} />
                <ProductGrid products={products} />
              </section>
            ))}
          </div>
        )}
        {data && data.items.length > 0 && brandId !== ALL_BRANDS && (
          <>
            <BrandSectionHeader brand={brandMap.get(brandId)} count={data.items.length} />
            <ProductGrid products={data.items} />
          </>
        )}
      </div>
    </PageShell>
  );
}
