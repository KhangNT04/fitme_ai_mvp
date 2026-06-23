import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
      <PackageOpen className="mb-4 h-12 w-12 text-stone-400" />
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p>
      )}
      {actionLabel && (onAction || actionHref) && (
        <Button className="mt-6" onClick={onAction} asChild={!!actionHref}>
          {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
        </Button>
      )}
    </div>
  );
}
