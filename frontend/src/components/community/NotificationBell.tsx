"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

function relativeTime(value: string): string {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(then).toLocaleDateString("vi-VN", { dateStyle: "medium" });
}

/**
 * The bell in the header: comments left on the viewer's posts and answers to the viewer's
 * comments. Only shown to signed-in users, since a guest has nothing to be notified about.
 */
export function NotificationBell({ className }: { className?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["community-notifications"],
    queryFn: () => communityApi.getNotifications(20),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (!isAuthenticated) return null;

  const list = notifications ?? [];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={list.length > 0 ? `Thông báo (${list.length} mới)` : "Thông báo"}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {list.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {list.length > 9 ? "9+" : list.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Clicking outside closes the panel. */}
          <button
            type="button"
            aria-label="Đóng thông báo"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <p className="border-b border-border/60 px-4 py-2.5 font-display text-sm font-semibold text-foreground">
              Thông báo
            </p>
            {list.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Chưa có thông báo nào.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {list.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/outfit/${item.postShareCode}`}
                      onClick={() => setOpen(false)}
                      className="flex gap-2.5 border-b border-border/40 px-4 py-3 last:border-b-0 hover:bg-muted/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {item.actorInitials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-foreground">
                          <strong className="font-semibold">{item.actorDisplayName}</strong>{" "}
                          {item.reply ? "trả lời bình luận của bạn" : "bình luận bài của bạn"}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {item.content}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MessageCircle className="h-3 w-3" aria-hidden="true" />
                          {relativeTime(item.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
