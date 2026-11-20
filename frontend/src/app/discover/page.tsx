"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { ChevronLeft, ChevronRight, SlidersHorizontal, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { BrandDiscoverSection } from "@/components/discover/BrandDiscoverSection";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
import { consumerPageShellClass } from "@/lib/design-tokens";
import {
  DISCOVER_SEARCH_FOCUS_EVENT,
  DISCOVER_SEARCH_HASH,
  focusDiscoverSearchInput,
  isDiscoverSearchInputVisible,
  openDiscoverSearch,
} from "@/lib/discover-search";
import { categoryFilterLabel } from "@/lib/product-category";
import { discoverBrandPath } from "@/lib/discover-brand";
import {
  CATALOG_EAGER_BRAND_ROWS,
  DISCOVER_BRANDS_PER_PAGE,
  DISCOVER_PRODUCTS_PER_BRAND,
  groupNewestProductsByBrand,
} from "@/lib/group-products-by-brand";
import { prefetchImages } from "@/lib/prefetch-images";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

const ALL_BRANDS = "all";
const ALL_CATEGORIES = "all";

const QuickShareDialog = dynamic(
  () =>
    import("@/components/community/QuickShareDialog").then((m) => m.QuickShareDialog),
  { ssr: false },
);

export default function DiscoverPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [aiOnly, setAiOnly] = useState(false);
  const [brandPage, setBrandPage] = useState(0);
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

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["products", "discover", debouncedSearch, category, aiOnly, DISCOVER_PRODUCTS_PER_BRAND],
    queryFn: () =>
      productApi.list({
        search: debouncedSearch || undefined,
        category: category !== ALL_CATEGORIES ? category : undefined,
        aiTryOnEligible: aiOnly || undefined,
        limitPerBrand: DISCOVER_PRODUCTS_PER_BRAND,
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const groupedByBrand = useMemo(() => {
    if (!data?.items.length) return null;
    // BE already limited; FE still groups and uses brandProductTotal for row labels.
    return groupNewestProductsByBrand(data.items, DISCOVER_PRODUCTS_PER_BRAND);
  }, [data]);

  const sortedBrandGroups = useMemo(() => {
    if (!groupedByBrand) return [];
    return [...groupedByBrand.entries()].sort((a, b) => {
      const nameA = brandMap.get(a[0])?.name ?? a[1].products[0]?.brandName ?? "";
      const nameB = brandMap.get(b[0])?.name ?? b[1].products[0]?.brandName ?? "";
      return nameA.localeCompare(nameB, "vi");
    });
  }, [groupedByBrand, brandMap]);

  const brandPageCount = Math.max(1, Math.ceil(sortedBrandGroups.length / DISCOVER_BRANDS_PER_PAGE));
  const safeBrandPage = Math.min(brandPage, brandPageCount - 1);

  const pagedBrandGroups = useMemo(() => {
    const start = safeBrandPage * DISCOVER_BRANDS_PER_PAGE;
    return sortedBrandGroups.slice(start, start + DISCOVER_BRANDS_PER_PAGE);
  }, [sortedBrandGroups, safeBrandPage]);

  // Reset to first brand page when filters change the result set.
  useEffect(() => {
    setBrandPage(0);
  }, [debouncedSearch, category, aiOnly]);

  // Warm only above-the-fold previews so LCP isn't fighting the full page catalog.
  useEffect(() => {
    if (pagedBrandGroups.length === 0) return;
    prefetchImages(
      pagedBrandGroups
        .slice(0, CATALOG_EAGER_BRAND_ROWS)
        .flatMap(([, preview]) => preview.products.flatMap((p) => p.images.slice(0, 1))),
      6,
    );
  }, [pagedBrandGroups]);

  const goToBrandPage = useCallback((next: number) => {
    setBrandPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToBrand = useCallback(
    (id: string) => {
      if (id !== ALL_BRANDS) router.push(discoverBrandPath(id));
    },
    [router],
  );

  useEffect(() => {
    const activateSearch = () => {
      if (window.location.hash !== DISCOVER_SEARCH_HASH) return;
      openDiscoverSearch();
    };

    const onFocusRequest = () => {
      for (const delay of [0, 200, 450, 750, 1200, 1600, 2000]) {
        window.setTimeout(focusSearchField, delay);
      }
    };

    activateSearch();
    window.addEventListener("hashchange", activateSearch);
    window.addEventListener(DISCOVER_SEARCH_FOCUS_EVENT, onFocusRequest);
    return () => {
      window.removeEventListener("hashchange", activateSearch);
      window.removeEventListener(DISCOVER_SEARCH_FOCUS_EVENT, onFocusRequest);
    };
  }, [focusSearchField]);

  const hasActiveFilters = category !== ALL_CATEGORIES || aiOnly;

  const clearFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORIES);
    setAiOnly(false);
    setBrandPage(0);
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
            <Select value={ALL_BRANDS} onValueChange={goToBrand}>
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
              <Select value={ALL_BRANDS} onValueChange={goToBrand}>
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
          {aiOnly && <Badge variant="secondary">Thử AI</Badge>}
          {search.trim() && <Badge variant="secondary">&quot;{search.trim()}&quot;</Badge>}
          <Button type="button" variant="ghost" className="h-auto px-0 text-xs" onClick={clearFilters}>
            Xóa tất cả
          </Button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Cộng đồng thời trang</p>
          <p className="truncate text-xs text-muted-foreground">
            Xem outfit người khác đã thử và chia sẻ.
          </p>
        </div>
        {/* Right side — quick share sits next to the "view community" action. */}
        <div className="flex shrink-0 items-center gap-2">
          <QuickShareDialog triggerClassName="rounded-full" />
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
            <Link href="/community">
              <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Xem cộng đồng
            </Link>
          </Button>
        </div>
      </div>

      <div>
        {isLoading && <LoadingSkeleton type="brand-rows" count={3} />}
        {error && !data && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        )}
        {pagedBrandGroups.length > 0 && (
          <div
            className={cn("space-y-10 transition-opacity duration-200", isFetching && !isLoading && "opacity-70")}
          >
            {pagedBrandGroups.map(([id, preview], rowIndex) => (
              <BrandDiscoverSection
                key={id}
                brand={brandMap.get(id)}
                products={preview.products}
                totalCount={preview.total}
                loadAllImages={rowIndex < CATALOG_EAGER_BRAND_ROWS}
                rowIndex={rowIndex}
              />
            ))}
          </div>
        )}

        {sortedBrandGroups.length > DISCOVER_BRANDS_PER_PAGE && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Trang brand trước"
              disabled={safeBrandPage === 0}
              onClick={() => goToBrandPage(safeBrandPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Trang {safeBrandPage + 1} / {brandPageCount}
              <span className="hidden sm:inline">
                {" "}
                · {sortedBrandGroups.length} thương hiệu · {DISCOVER_BRANDS_PER_PAGE}/trang
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Trang brand sau"
              disabled={safeBrandPage + 1 >= brandPageCount}
              onClick={() => goToBrandPage(safeBrandPage + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
