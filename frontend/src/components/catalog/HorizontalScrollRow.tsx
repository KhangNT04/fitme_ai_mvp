"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalogProductRowClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type Edge = { left: boolean; right: boolean };

function measureEdges(el: HTMLElement): Edge {
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 4) return { left: false, right: false };
  return {
    left: el.scrollLeft > 4,
    right: el.scrollLeft < max - 4,
  };
}

/**
 * Horizontally scrollable product strip with edge fades + chevrons so overflow is obvious.
 */
export function HorizontalScrollRow({
  children,
  ariaLabel,
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edge>({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = measureEdges(el);
    setEdges((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next,
    );
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    const onScroll = () => syncEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(syncEdges);
    ro.observe(el);
    // Child list size changes (filter/selection) also change scrollWidth.
    const mo = new MutationObserver(syncEdges);
    mo.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.78, 220);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        className={catalogProductRowClass}
        aria-label={ariaLabel}
      >
        {children}
        {/* Keeps the last card clear of the right fade / chevron when the row overflows. */}
        <div className="w-8 shrink-0 sm:w-12" aria-hidden="true" />
      </div>

      {/* Edge fades cover the clipped side — scroll cue without a permanent scrollbar. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[var(--background)] to-transparent transition-opacity duration-200 sm:w-14",
          edges.left ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[1] w-14 bg-gradient-to-l from-[var(--background)] to-transparent transition-opacity duration-200 sm:w-20",
          edges.right ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />

      {edges.left ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute left-1 top-1/2 z-[2] hidden size-9 -translate-y-1/2 rounded-full border-border/70 bg-white/95 shadow-md sm:inline-flex"
          aria-label="Lướt sang trái"
          onClick={() => scrollByPage(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
      {edges.right ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-1 top-1/2 z-[2] inline-flex size-9 -translate-y-1/2 rounded-full border-border/70 bg-white/95 shadow-md"
          aria-label="Lướt sang phải"
          onClick={() => scrollByPage(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
