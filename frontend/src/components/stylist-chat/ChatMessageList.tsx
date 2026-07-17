"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ChatOutfitOptions } from "./ChatOutfitOptions";
import { ChatQuickPrompts } from "./ChatQuickPrompts";
import type { StylistChatMessage } from "@/types/stylist-chat";
import { STYLIST_WELCOME } from "@/types/stylist-chat";

interface ChatMessageListProps {
  messages: StylistChatMessage[];
  showWelcome: boolean;
  onQuickPrompt: (prompt: string) => void;
  quickPromptsDisabled?: boolean;
}

export function ChatMessageList({
  messages,
  showWelcome,
  onQuickPrompt,
  quickPromptsDisabled,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2">
      {showWelcome && (
        <>
          <ChatBubble role="assistant">
            <p>{STYLIST_WELCOME}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Chọn gợi ý nhanh bên dưới hoặc mô tả vibe / dịp mặc của bạn.
            </p>
          </ChatBubble>
          <ChatQuickPrompts onSelect={onQuickPrompt} disabled={quickPromptsDisabled} />
        </>
      )}

      {messages.map((msg) => (
        <ChatBubble key={msg.id} role={msg.role}>
          {msg.type === "outfit_options" ? (
            <ChatOutfitOptions
              content={msg.content}
              options={msg.options}
              recommendations={msg.recommendations}
              compact={msg.compactOutfits}
            />
          ) : (
            <p className="whitespace-pre-line">{msg.content}</p>
          )}
        </ChatBubble>
      ))}
      <div ref={endRef} />
    </div>
  );
}
