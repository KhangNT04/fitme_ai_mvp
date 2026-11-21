import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PinnedBackLink } from "@/components/layout/PinnedBackLink";
import { cn } from "@/lib/utils";

interface PortalLoginShellProps {
  title: string;
  /** Distinguishes Admin vs Brand so the page does not feel like the consumer storefront. */
  portal: "admin" | "brand";
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

const PORTAL_BADGE: Record<"admin" | "brand", string> = {
  admin: "Cổng quản trị",
  brand: "Cổng thương hiệu",
};

export function PortalLoginShell({
  title,
  portal,
  description,
  children,
  footer,
  backHref = "/",
  backLabel = "Về trang chủ",
}: PortalLoginShellProps) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--primary)_10%,transparent),_transparent_58%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,_color-mix(in_srgb,var(--muted)_80%,transparent),_transparent)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        {backHref && <PinnedBackLink href={backHref} label={backLabel} className="mb-4" />}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="gradient-ai flex h-12 w-12 items-center justify-center rounded-2xl shadow-md shadow-primary/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-foreground">FitMe AI</p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/15">
              {PORTAL_BADGE[portal]}
            </span>
          </div>
        </div>
        <Card className="border-border/70 bg-card/95 shadow-lg shadow-black/5 backdrop-blur-sm">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="font-display text-xl tracking-tight">{title}</CardTitle>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            {children}
            {footer}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PortalLoginFooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-4 text-center text-sm text-muted-foreground", className)}>
      <Link href={href} className="underline-offset-2 hover:text-foreground hover:underline">
        {children}
      </Link>
    </p>
  );
}
