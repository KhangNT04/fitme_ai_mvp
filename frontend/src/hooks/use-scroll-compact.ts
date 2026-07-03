"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Sticky main nav height — keep in sync with Header h-16 / StickyToolbar top-16 */
export const MAIN_NAV_OFFSET_PX = 64;

/**
 * Compact once the user scrolls past the expanded header block.
 * Measures expanded height first, then compares scroll position (stable vs sentinel-only IO).
 */
export function useScrollCompact(enabled = true) {
  const headerRef = useRef<HTMLDivElement>(null);
  const documentTopRef = useRef<number | null>(null);
  const expandedBottomRef = useRef(0);
  const [scrolledPast, setScrolledPast] = useState(false);
  const compact = enabled && scrolledPast;

  const measureExpandedBottom = useCallback(() => {
    const el = headerRef.current;
    if (!el) return;
    const height = el.offsetHeight;
    if (documentTopRef.current === null || window.scrollY === 0) {
      documentTopRef.current = el.getBoundingClientRect().top + window.scrollY;
    }
    expandedBottomRef.current = documentTopRef.current + height;
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    measureExpandedBottom();
  }, [enabled, measureExpandedBottom]);

  useLayoutEffect(() => {
    if (!enabled || compact) return;
    measureExpandedBottom();
  }, [compact, enabled, measureExpandedBottom]);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      setScrolledPast(window.scrollY + MAIN_NAV_OFFSET_PX >= expandedBottomRef.current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    const onResize = () => {
      if (window.scrollY === 0) documentTopRef.current = null;
      if (!compact) measureExpandedBottom();
      update();
    };
    window.addEventListener("resize", onResize);

    const el = headerRef.current;
    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (!compact) measureExpandedBottom();
        update();
      });
      ro.observe(el);
    }

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [compact, enabled, measureExpandedBottom]);

  return { headerRef, compact };
}
