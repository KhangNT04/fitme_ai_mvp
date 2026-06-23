"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { cn } from "@/lib/utils";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function TryOnSizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await tryonApi.variantSize(id, selected);
      router.push(`/try-on/result/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">So sánh size</h1>
      <p className="mt-2 text-stone-500">Thử size khác cho outfit</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={cn(
              "rounded-lg border px-6 py-3 text-sm font-medium",
              selected === s ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <Disclaimer className="mt-6" />
      <Button className="mt-6 w-full" disabled={!selected || loading} onClick={handleApply}>
        {loading ? "Đang xử lý..." : "Áp dụng size"}
      </Button>
    </div>
  );
}
