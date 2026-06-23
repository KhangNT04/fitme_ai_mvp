"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Save, Palette, Ruler, Shirt } from "lucide-react";
import { tryonApi } from "@/services/tryon-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Disclaimer } from "@/components/layout/Disclaimer";

export default function TryOnResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tryon-result", id],
    queryFn: () => tryonApi.getResult(id),
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-8"><LoadingSkeleton type="detail" /></div>;
  if (error || !data) return <div className="mx-auto max-w-2xl px-4 py-8"><ErrorState onRetry={() => refetch()} /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Kết quả thử mặc AI</h1>

      <div className="mt-6 relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
        {data.previewImageUrl ? (
          <Image src={data.previewImageUrl} alt="Try-on preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">Preview outfit board</div>
        )}
      </div>

      <Disclaimer className="mt-6" />

      <div className="mt-6 flex flex-wrap gap-2">
        {data.recommendedSize && <Badge>Gợi ý size: {data.recommendedSize}</Badge>}
        {data.recommendedForm && <Badge variant="secondary">Form: {data.recommendedForm}</Badge>}
        {data.recommendedColor && <Badge variant="outline">Màu: {data.recommendedColor}</Badge>}
      </div>

      {data.improvementSuggestions && data.improvementSuggestions.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Gợi ý cải thiện</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-stone-600">
            {data.improvementSuggestions.map((s, i) => <p key={i}>• {s}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" asChild><Link href={`/try-on/color/${id}`}><Palette className="mr-2 h-4 w-4" />Thử màu khác</Link></Button>
        <Button variant="outline" asChild><Link href={`/try-on/size/${id}`}><Ruler className="mr-2 h-4 w-4" />Thử size khác</Link></Button>
        <Button variant="outline" asChild><Link href={`/try-on/form/${id}`}><Shirt className="mr-2 h-4 w-4" />Thử form khác</Link></Button>
        <Button onClick={() => tryonApi.save(id)}><Save className="mr-2 h-4 w-4" />Lưu kết quả</Button>
      </div>

      <Button className="mt-4 w-full" asChild>
        <Link href={`/try-on/decision/${id}`}>Quyết định tiếp theo</Link>
      </Button>
    </div>
  );
}
