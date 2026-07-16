"use client";

import { Chip } from "@/components/ui/chip";
import { STYLIST_QUICK_PROMPTS } from "@/types/stylist-chat";

interface ChatQuickPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatQuickPrompts({ onSelect, disabled }: ChatQuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STYLIST_QUICK_PROMPTS.map((prompt) => (
        <Chip
          key={prompt}
          type="button"
          disabled={disabled}
          className="max-w-full whitespace-normal text-left text-xs sm:text-sm"
          onClick={() => onSelect(prompt)}
        >
          {prompt.length > 56 ? `${prompt.slice(0, 56)}…` : prompt}
        </Chip>
      ))}
    </div>
  );
}
