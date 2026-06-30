import type { ReactNode } from "react";
import {
  productDetailGridClass,
  productDetailMediaColumnClass,
  productDetailShellClass,
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ProductDetailLayoutProps {
  media: ReactNode;
  mediaThumbnails?: ReactNode;
  /** Product title, price, specs, size table — excludes action buttons. */
  children: ReactNode;
  actions: ReactNode;
  /** Full-width block below gallery + info (e.g. AI outfit explanation). */
  aiExplanation?: ReactNode;
  className?: string;
}

export function ProductDetailLayout({
  media,
  mediaThumbnails,
  children,
  actions,
  aiExplanation,
  className,
}: ProductDetailLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className={productDetailShellClass}>
        {/* Mobile: stacked */}
        <div className="flex flex-col gap-8 lg:hidden">
          <div className={productDetailMediaColumnClass}>
            {media}
            {mediaThumbnails && <div className="mt-4">{mediaThumbnails}</div>}
          </div>
          <div>{children}</div>
          <div className="pt-2">{actions}</div>
        </div>

        {/* Desktop: image bottom aligns with size table; actions below table */}
        <div className="hidden space-y-6 lg:block">
          <div className={cn(productDetailGridClass, "items-stretch")}>
            <div className={cn("flex h-full min-h-0 flex-col", productDetailMediaColumnClass, "lg:w-auto lg:max-w-none")}>
              {media}
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
          </div>

          <div className={productDetailGridClass}>
            <div className={cn(productDetailMediaColumnClass, "lg:w-auto lg:max-w-none")}>
              {mediaThumbnails}
            </div>
            <div className="min-w-0 pt-1">{actions}</div>
          </div>
        </div>
      </div>

      {aiExplanation}
    </div>
  );
}
