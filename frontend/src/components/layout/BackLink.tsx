import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
  /** Solid white background — for opaque sticky toolbars */
  solid?: boolean;
}

export function BackLink({ href, label = "Quay lại", className, solid }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-all",
        solid
          ? "border-border/60 bg-white text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
          : "border-border/50 bg-white/70 text-muted-foreground hover:border-border hover:bg-white hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}
