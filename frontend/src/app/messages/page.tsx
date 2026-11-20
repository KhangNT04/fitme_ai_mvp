"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shopChatApi } from "@/services/shop-chat-api";
import { ShopChatThreadView } from "@/components/shop-chat/ShopChatThreadView";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageSuspense } from "@/components/common/PageSuspense";
import { useAuthStore } from "@/stores/auth-store";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function MessagesPage() {
  return (
    <PageSuspense>
      <MessagesContent />
    </PageSuspense>
  );
}

function MessagesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get("thread");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [activeId, setActiveId] = useState<string | null>(threadFromUrl);

  const listQuery = useQuery({
    queryKey: ["shop-chat", "mine"],
    queryFn: () => shopChatApi.listMine(),
    enabled: isAuthenticated,
    refetchInterval: 12_000,
  });

  const threads = listQuery.data?.items ?? [];

  useEffect(() => {
    if (threadFromUrl) setActiveId(threadFromUrl);
  }, [threadFromUrl]);

  useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
  }, [activeId, threads]);

  const detailQuery = useQuery({
    queryKey: ["shop-chat", "mine", activeId],
    queryFn: () => shopChatApi.getMine(activeId!),
    enabled: isAuthenticated && !!activeId,
    refetchInterval: 5_000,
  });

  if (!isAuthenticated) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <CollapsingPageHeader title="Tin nhắn shop" subtitle="Đăng nhập để chat với thương hiệu" />
        <EmptyState
          title="Cần đăng nhập"
          description="Đăng nhập để xem và trả lời hội thoại với shop."
          actionLabel="Đăng nhập"
          actionHref="/login?next=/messages"
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Tin nhắn shop"
        subtitle="Hỏi size, chất liệu và tình trạng hàng trực tiếp với thương hiệu"
      />
      {listQuery.isLoading && <LoadingSkeleton />}
      {listQuery.error && <ErrorState onRetry={() => void listQuery.refetch()} />}
      {listQuery.data && threads.length === 0 && (
        <EmptyState
          title="Chưa có hội thoại"
          description="Mở trang sản phẩm và bấm “Nhắn shop” để bắt đầu."
          actionLabel="Khám phá sản phẩm"
          actionHref="/discover"
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
                <p className="truncate text-sm font-medium">{t.brandName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.lastMessagePreview || "Chưa có tin nhắn"}
                </p>
                {t.unreadCount > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {t.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </aside>
          <div>
            {detailQuery.isLoading && <LoadingSkeleton />}
            {detailQuery.data && (
              <ShopChatThreadView
                thread={detailQuery.data.thread}
                messages={detailQuery.data.messages}
                selfRole="USER"
                onSend={async (body) => {
                  try {
                    await shopChatApi.sendMine(detailQuery.data.thread.id, body);
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["shop-chat", "mine"] }),
                      detailQuery.refetch(),
                    ]);
                  } catch (err) {
                    toast.error(getUserErrorMessage(err, "Không gửi được tin nhắn"));
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
