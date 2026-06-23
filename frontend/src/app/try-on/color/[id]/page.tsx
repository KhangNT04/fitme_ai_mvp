"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { cn } from "@/lib/utils";

const COLORS = ["Đen", "Trắng", "Navy", "Beige", "Nâu", "Xám", "Pastel"];

export default function TryOnColorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await tryonApi.variantColor(id, selected);
      router.push(`/try-on/result/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">So sánh màu</h1>
      <p className="mt-2 text-stone-500">Thử màu khác cho outfit</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            className={cn(
              "rounded-full border px-5 py-2 text-sm",
              selected === c ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <Disclaimer className="mt-6" />
      <Button className="mt-6 w-full" disabled={!selected || loading} onClick={handleApply}>
        {loading ? "Đang xử lý..." : "Áp dụng màu"}
      </Button>
    </div>
  );
}
