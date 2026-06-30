import { cn } from "@/lib/utils";
import { pageTitle, pageSubtitle } from "@/lib/design-tokens";

interface PortalPageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PortalPageHeader({ title, description, children, className }: PortalPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className={pageTitle}>{title}</h1>
        {description && <p className={pageSubtitle}>{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
