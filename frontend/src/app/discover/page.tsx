"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [aiOnly, setAiOnly] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", search, category, aiOnly],
    queryFn: () =>
      productApi.list({
        search: search || undefined,
        category: category || undefined,
        aiTryOnEligible: aiOnly || undefined,
      }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Khám phá sản phẩm</h1>
      <p className="mt-2 text-stone-500">Tìm sản phẩm phù hợp và tư vấn size bằng AI</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={aiOnly ? "default" : "outline"}
          onClick={() => setAiOnly(!aiOnly)}
        >
          Chỉ sản phẩm thử AI
        </Button>
      </div>

      <div className="mt-8">
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        )}
        {data && data.items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
