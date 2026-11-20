"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ShopChatMessage, ShopChatThread } from "@/services/shop-chat-api";

export function ShopChatThreadView({
  thread,
  messages,
  onSend,
  sending,
  selfRole,
}: {
  thread: ShopChatThread;
  messages: ShopChatMessage[];
  onSend: (body: string) => Promise<void> | void;
  sending?: boolean;
  selfRole: "USER" | "BRAND" | "ADMIN";
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    await onSend(body);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <p className="truncate font-medium text-foreground">
          {selfRole === "USER" ? thread.brandName : thread.userDisplayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {thread.productName ? `SP: ${thread.productName}` : "Hội thoại với shop"}
          {" · "}
          {thread.status}
        </p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => {
          const mine =
            m.senderRole === selfRole ||
            (selfRole === "ADMIN" && m.senderRole === "ADMIN");
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] opacity-70">
                    {m.senderDisplayName || m.senderRole}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <footer className="flex gap-2 border-t border-border/60 p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nhập tin nhắn..."
          disabled={thread.status === "LOCKED" || sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button type="button" onClick={() => void submit()} disabled={sending || !draft.trim()}>
          Gửi
        </Button>
      </footer>
    </div>
  );
}
