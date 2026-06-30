"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastItem } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = iconMap[item.type];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        item.type === "success" && "border-emerald-200/80 bg-emerald-50/95 text-emerald-950",
        item.type === "error" && "border-red-200/80 bg-red-50/95 text-red-950",
        item.type === "info" && "border-primary/20 bg-card/95 text-foreground",
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
      <button
        type="button"
        className="shrink-0 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Đóng thông báo"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-20 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-20 sm:w-full sm:max-w-sm"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}
