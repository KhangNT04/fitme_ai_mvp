"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { recommendationApi } from "@/services/recommendation-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function AiVariantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => recommendationApi.getById(id),
  });

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title="Thử biến thể"
        subtitle="So sánh size, form và màu sắc khác nhau"
        showAiBadge
        backHref={`/ai/result/${id}`}
        backLabel="Kết quả tư vấn"
      />

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">So sánh size</CardTitle></CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1 rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Gợi ý</p>
              <p className="text-xl font-bold">{data?.recommendedSize || "M"}</p>
            </div>
            <div className="flex-1 rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Thay thế</p>
              <p className="text-xl font-bold">{data?.alternativeSize || "L"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gợi ý form</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{data?.recommendedForm || "Regular"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gợi ý màu sắc</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{data?.recommendedColor || "Navy"}</p>
          </CardContent>
        </Card>
      </div>

      <Disclaimer className="mt-6" />

      <Button className="mt-6 w-full" asChild>
        <Link href={`/ai/result/${id}`}>Quay lại kết quả</Link>
      </Button>
    </PageShell>
  );
}
