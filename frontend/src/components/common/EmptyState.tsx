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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground/70">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {actionLabel && (onAction || actionHref) && (
        <Button className="mt-6" onClick={onAction} asChild={!!actionHref}>
          {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
        </Button>
      )}
    </div>
  );
}
