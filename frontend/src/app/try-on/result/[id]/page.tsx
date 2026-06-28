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
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";

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

  if (isLoading) {
    return (
      <PageShell width="medium">
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }
  if (error || !data) {
    return (
      <PageShell width="medium">
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="medium">
      <PageHeader steps={TRYON_FLOW_STEPS} currentStep={3} title="Kết quả thử mặc AI" showAiBadge backHref="/try-on" backLabel="Thử mặc AI" />

      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        {data.previewImageUrl ? (
          <Image src={data.previewImageUrl} alt="Try-on preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/70">Preview outfit board</div>
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
          <CardContent className="space-y-2 text-sm text-muted-foreground">
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
    </PageShell>
  );
}
