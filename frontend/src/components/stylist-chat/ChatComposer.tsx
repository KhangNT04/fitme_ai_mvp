"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STYLIST_COMPOSER_PLACEHOLDER } from "@/types/stylist-chat";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  sending?: boolean;
}

export function ChatComposer({ onSend, disabled, sending }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        disabled={disabled || sending}
        placeholder={STYLIST_COMPOSER_PLACEHOLDER}
        className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        aria-label="Tin nhắn tư vấn"
      />
      <Button
        type="button"
        size="icon"
        variant="ai"
        className="h-10 w-10 shrink-0 rounded-xl"
        disabled={disabled || sending || !value.trim()}
        onClick={submit}
        aria-label="Gửi"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
