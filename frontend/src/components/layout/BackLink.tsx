"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavBack } from "@/hooks/use-nav-back";

interface BackLinkProps {
  /** Fallback when there is no in-app history (direct entry). */
  href: string;
  label?: string;
  className?: string;
  solid?: boolean;
  compact?: boolean;
  /** Icon only at all breakpoints — label stays for screen readers */
  iconOnly?: boolean;
  /** Always use href/label props — ignore nav history stack */
  disableHistory?: boolean;
}

export function BackLink({
  href,
  label = "Quay lại",
  className,
  solid,
  compact,
  iconOnly = false,
  disableHistory = false,
}: BackLinkProps) {
  const { href: resolvedHref, label: resolvedLabel, navigateBack } = useNavBack(
    { href, label },
    { disableHistory },
  );
  const hideLabelVisually = iconOnly;

  return (
    <Link
      href={resolvedHref}
      onClick={(event) => {
        navigateBack(event);
      }}
      className={cn(
        "inline-flex items-center rounded-full border font-medium shadow-sm transition-all",
        hideLabelVisually
          ? "p-1.5"
          : cn(
              "p-1.5 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
              compact && "sm:py-1 sm:text-xs",
            ),
        solid
          ? "border-border/60 bg-white text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
          : "border-border/50 bg-white/70 text-muted-foreground hover:border-border hover:bg-white hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {hideLabelVisually ? (
        <span className="sr-only">{resolvedLabel}</span>
      ) : (
        <>
          <span className="sr-only sm:hidden">{resolvedLabel}</span>
          <span className="hidden sm:inline">{resolvedLabel}</span>
        </>
      )}
    </Link>
  );
}
