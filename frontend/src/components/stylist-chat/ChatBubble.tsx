"use client";

import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}

export function ChatBubble({ role, children, className }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/60 bg-card text-foreground shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
