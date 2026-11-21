import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PortalSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One-purpose section block for portal dashboards and dense admin pages. */
export function PortalSection({ title, description, actions, children, className }: PortalSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
