"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { PortalSection } from "@/components/portal/PortalSection";
import { Card, CardContent } from "@/components/ui/card";

export default function BrandDemandInsightsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-demand-insights"],
    queryFn: () => brandApi.getDemandInsights(),
  });

  const likeToBuy =
    data && data.outfitLikes > 0
      ? Math.round((data.buyClicks / data.outfitLikes) * 100)
      : null;
  const confirmRate =
    data && data.buyClicks > 0
      ? Math.round((data.purchasedConfirmed / data.buyClicks) * 100)
      : null;

  return (
    <PortalBrandPage
      title="Nhu cầu Gen Z"
      description="Tín hiệu first-party (like / click mua / xác nhận mua) — không PII, không scrape."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      {data && (
        <div className="space-y-6">
          <PortalSection title="Tín hiệu tổng" description={data.summaryVi}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Outfit like" value={data.outfitLikes} />
              <Stat label="Outfit dislike" value={data.outfitDislikes} />
              <Stat label="Click mua" value={data.buyClicks} />
              <Stat label="Xác nhận mua" value={data.purchasedConfirmed} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Like → click" value={likeToBuy == null ? "—" : `${likeToBuy}%`} />
              <Stat label="Click → xác nhận" value={confirmRate == null ? "—" : `${confirmRate}%`} />
            </div>
          </PortalSection>

          <div className="grid gap-4 sm:grid-cols-2">
            <InsightList
              title="Top sản phẩm được click mua"
              items={data.topClickedProducts}
              emptyHint="Chưa có click mua — khi Gen Z bấm mua từ outfit, top sẽ hiện ở đây."
            />
            <InsightList
              title="Tín hiệu like (theo sản phẩm)"
              items={data.topLikedSignals}
              emptyHint="Chưa có like gắn sản phẩm. Encourage feedback trên outfit card."
            />
          </div>
        </div>
      )}
    </PortalBrandPage>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function InsightList({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: { label: string; count: number }[];
  emptyHint: string;
}) {
  const meaningful = items.filter((i) => i.count > 0 && i.label !== "Chưa có dữ liệu");
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meaningful.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {meaningful.map((item) => (
              <li key={item.label} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
