"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, RotateCcw, Sparkles } from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/Disclaimer";

export default function TryOnDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data } = useQuery({
    queryKey: ["tryon-result", id],
    queryFn: () => tryonApi.getResult(id),
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Quyết định tiếp theo</h1>
      <p className="mt-2 text-stone-500">Bạn muốn làm gì với kết quả thử mặc?</p>

      <Disclaimer className="mt-6" />

      <div className="mt-8 space-y-4">
        {data?.items.map((item) => (
          <Card key={item.productId}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-stone-500">Size gợi ý: {data.recommendedSize}</p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/redirect/confirm/${item.productId}`}>
                  <ShoppingBag className="mr-1 h-4 w-4" />Mua
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-3">
        <Button variant="outline" asChild>
          <Link href="/try-on"><RotateCcw className="mr-2 h-4 w-4" />Thử outfit khác</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/discover"><Sparkles className="mr-2 h-4 w-4" />Xem sản phẩm tương tự</Link>
        </Button>
        <Button asChild>
          <Link href={`/try-on/result/${id}`}>Xem lại kết quả</Link>
        </Button>
      </div>
    </div>
  );
}
