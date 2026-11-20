"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shopChatApi } from "@/services/shop-chat-api";
import { ShopChatThreadView } from "@/components/shop-chat/ShopChatThreadView";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function BrandInboxPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["brand-inbox"],
    queryFn: () => shopChatApi.listBrand(),
    refetchInterval: 10_000,
  });
  const threads = listQuery.data?.items ?? [];

  useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
  }, [activeId, threads]);

  const detailQuery = useQuery({
    queryKey: ["brand-inbox", activeId],
    queryFn: () => shopChatApi.getBrand(activeId!),
    enabled: !!activeId,
    refetchInterval: 5_000,
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Inbox khách"
        description="Trả lời khách hỏi size / sản phẩm từ FitMe. Mỗi khách một hội thoại."
      />
      {listQuery.isLoading && <LoadingSkeleton />}
      {listQuery.error && <ErrorState onRetry={() => void listQuery.refetch()} />}
      {listQuery.data && threads.length === 0 && (
        <EmptyState
          title="Chưa có tin nhắn"
          description="Khi khách bấm “Nhắn shop” trên sản phẩm của bạn, hội thoại sẽ hiện ở đây."
        />
      )}
      {threads.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-1 rounded-2xl border border-border bg-card p-2">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left transition-colors",
                  activeId === t.id ? "bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <p className="truncate text-sm font-medium">{t.userDisplayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.lastMessagePreview || t.productName || "Hội thoại mới"}
                </p>
                {t.unreadCount > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {t.unreadCount} mới
                  </span>
                )}
              </button>
            ))}
          </aside>
          <div className="space-y-2">
            {detailQuery.data && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await shopChatApi.setBrandStatus(detailQuery.data.thread.id, "CLOSED");
                      void queryClient.invalidateQueries({ queryKey: ["brand-inbox"] });
                    }}
                  >
                    Đóng hội thoại
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await shopChatApi.setBrandStatus(detailQuery.data.thread.id, "OPEN");
                      void queryClient.invalidateQueries({ queryKey: ["brand-inbox"] });
                    }}
                  >
                    Mở lại
                  </Button>
                </div>
                <ShopChatThreadView
                  thread={detailQuery.data.thread}
                  messages={detailQuery.data.messages}
                  selfRole="BRAND"
                  onSend={async (body) => {
                    try {
                      await shopChatApi.sendBrand(detailQuery.data.thread.id, body);
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["brand-inbox"] }),
                        detailQuery.refetch(),
                      ]);
                    } catch (err) {
                      toast.error(getUserErrorMessage(err, "Không gửi được tin nhắn"));
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
