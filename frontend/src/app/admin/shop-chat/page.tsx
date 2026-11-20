"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shopChatApi } from "@/services/shop-chat-api";
import { ShopChatThreadView } from "@/components/shop-chat/ShopChatThreadView";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function AdminShopChatPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-shop-chat"],
    queryFn: () => shopChatApi.listAdmin(),
    refetchInterval: 15_000,
  });
  const threads = listQuery.data?.items ?? [];

  useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
  }, [activeId, threads]);

  const detailQuery = useQuery({
    queryKey: ["admin-shop-chat", activeId],
    queryFn: () => shopChatApi.getAdmin(activeId!),
    enabled: !!activeId,
    refetchInterval: 8_000,
  });

  return (
    <PortalAdminPage
      title="Chat shop"
      description="Giám sát hội thoại khách ↔ brand, khóa khi cần, hoặc nhắn với vai trò quản trị."
    >
      {listQuery.isLoading && <LoadingSkeleton />}
      {listQuery.error && <ErrorState onRetry={() => void listQuery.refetch()} />}
      {listQuery.data && threads.length === 0 && (
        <EmptyState title="Chưa có hội thoại" description="Khi có tin nhắn shop, danh sách sẽ hiện tại đây." />
      )}
      {threads.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
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
                <p className="truncate text-sm font-medium">
                  {t.userDisplayName} ↔ {t.brandName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.lastMessagePreview || t.status}
                </p>
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
                    variant="destructive"
                    onClick={async () => {
                      await shopChatApi.setAdminStatus(detailQuery.data.thread.id, "LOCKED");
                      void queryClient.invalidateQueries({ queryKey: ["admin-shop-chat"] });
                    }}
                  >
                    Khóa hội thoại
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await shopChatApi.setAdminStatus(detailQuery.data.thread.id, "OPEN");
                      void queryClient.invalidateQueries({ queryKey: ["admin-shop-chat"] });
                    }}
                  >
                    Mở lại
                  </Button>
                </div>
                <ShopChatThreadView
                  thread={detailQuery.data.thread}
                  messages={detailQuery.data.messages}
                  selfRole="ADMIN"
                  onSend={async (body) => {
                    try {
                      await shopChatApi.sendAdmin(detailQuery.data.thread.id, body);
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["admin-shop-chat"] }),
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
    </PortalAdminPage>
  );
}
