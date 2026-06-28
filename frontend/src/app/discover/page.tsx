"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyToolbar, StickyToolbarSection } from "@/components/layout/StickyToolbar";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
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
    <div className="mb-2.5 flex items-center gap-2.5 border-b border-border/40 pb-2">
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
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

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public"],
    queryFn: () => publicBrandApi.list(),
  });

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", search, category, brandId, aiOnly],
    queryFn: () =>
      productApi.list({
        search: search || undefined,
        category: category !== ALL_CATEGORIES ? category : undefined,
        brandId: brandId !== ALL_BRANDS ? brandId : undefined,
        aiTryOnEligible: aiOnly || undefined,
      }),
  });

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
    const focusSearch = () => {
      if (window.location.hash !== "#discover-search") return;
      const input = document.getElementById("discover-search");
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    focusSearch();
    window.addEventListener("hashchange", focusSearch);
    return () => window.removeEventListener("hashchange", focusSearch);
  }, []);

  return (
    <PageShell width="full" className="py-4 sm:py-5">
      <StickyToolbar>
        <StickyToolbarSection>
          <PageHeader
            title="Khám phá sản phẩm"
            subtitle="Lọc theo thương hiệu, tìm sản phẩm phù hợp và tư vấn size bằng AI."
            backHref="/"
            backLabel="Trang chủ"
            sticky={false}
            dense
            solidBackLink
          />
        </StickyToolbarSection>

        <StickyToolbarSection filters>
            <Input
              id="discover-search"
              placeholder="Tìm kiếm sản phẩm hoặc thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 min-w-[160px] max-w-xs flex-1 rounded-full border-border/60 bg-white px-4"
            />
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="h-9 w-40 rounded-full border-border/60 bg-white sm:w-44">
                <SelectValue placeholder="Thương hiệu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANDS}>Tất cả thương hiệu</SelectItem>
                {filteredBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-32 rounded-full border-border/60 bg-white sm:w-36">
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
            <Button
              size="sm"
              variant={aiOnly ? "default" : "outline"}
              className="h-9 rounded-full px-4"
              onClick={() => setAiOnly(!aiOnly)}
            >
              Chỉ sản phẩm thử AI
            </Button>
        </StickyToolbarSection>
      </StickyToolbar>

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
