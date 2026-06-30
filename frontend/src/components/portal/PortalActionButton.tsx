"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import {
  BarChart3,
  Check,
  EyeOff,
  Flag,
  Loader2,
  PauseCircle,
  Pencil,
  Save,
  Send,
  Trash2,
  Eye,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const portalActionVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 h-8 px-2.5 shadow-sm",
  {
    variants: {
      variant: {
        edit: "border border-sky-300/80 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-400 focus-visible:ring-sky-400/40",
        analytics:
          "border border-violet-300/80 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:border-violet-400 focus-visible:ring-violet-400/40",
        delete:
          "border border-red-300/80 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 focus-visible:ring-red-400/40",
        approve:
          "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 focus-visible:ring-emerald-500/40",
        reject:
          "border border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400 focus-visible:ring-amber-400/40",
        flag: "border border-orange-300/80 bg-orange-50 text-orange-900 hover:bg-orange-100 hover:border-orange-400 focus-visible:ring-orange-400/40",
        suspend:
          "border border-rose-300/80 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:border-rose-400 focus-visible:ring-rose-400/40",
        resolve:
          "border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700 focus-visible:ring-teal-500/40",
        save: "border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40",
        submit:
          "border border-primary bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40",
        hide: "border border-slate-300/80 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-400 focus-visible:ring-slate-400/40",
        view: "border border-indigo-300/80 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-400 focus-visible:ring-indigo-400/40",
      },
    },
    defaultVariants: { variant: "edit" },
  },
);

export type PortalActionVariant = NonNullable<VariantProps<typeof portalActionVariants>["variant"]>;

const ACTION_ICONS: Record<PortalActionVariant, LucideIcon> = {
  edit: Pencil,
  analytics: BarChart3,
  delete: Trash2,
  approve: Check,
  reject: X,
  flag: Flag,
  suspend: PauseCircle,
  resolve: Wrench,
  save: Save,
  submit: Send,
  hide: EyeOff,
  view: Eye,
};

type ActionContentProps = {
  variant: PortalActionVariant;
  hideIcon?: boolean;
  loading?: boolean;
  children: React.ReactNode;
};

function ActionContent({ variant, hideIcon, loading, children }: ActionContentProps) {
  const Icon = ACTION_ICONS[variant];
  return (
    <>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        !hideIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {children}
    </>
  );
}

export function PortalActionGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

type PortalActionButtonProps = VariantProps<typeof portalActionVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    hideIcon?: boolean;
    loading?: boolean;
  };

export function PortalActionButton({
  variant = "edit",
  className,
  hideIcon,
  loading,
  disabled,
  children,
  ...props
}: PortalActionButtonProps) {
  const resolvedVariant = variant ?? "edit";
  return (
    <button
      type="button"
      className={cn(portalActionVariants({ variant: resolvedVariant }), className)}
      disabled={disabled || loading}
      {...props}
    >
      <ActionContent variant={resolvedVariant} hideIcon={hideIcon} loading={loading}>
        {children}
      </ActionContent>
    </button>
  );
}

type PortalActionLinkProps = VariantProps<typeof portalActionVariants> &
  Omit<React.ComponentProps<typeof Link>, "href"> & {
    href: string;
    hideIcon?: boolean;
  };

export function PortalActionLink({
  variant = "edit",
  className,
  hideIcon,
  href,
  children,
  ...props
}: PortalActionLinkProps) {
  const resolvedVariant = variant ?? "edit";
  return (
    <Link
      href={href}
      className={cn(portalActionVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      <ActionContent variant={resolvedVariant} hideIcon={hideIcon}>
        {children}
      </ActionContent>
    </Link>
  );
}
