"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  getNavHistorySnapshot,
  popNavHistory,
  resolveNavBack,
  notifyNavHistoryChange,
  type NavHistoryEntry,
} from "@/lib/nav-history";

const SERVER_SNAPSHOT: NavHistoryEntry[] = [];

function subscribe(callback: () => void): () => void {
  window.addEventListener("fitme-nav-history", callback);
  return () => window.removeEventListener("fitme-nav-history", callback);
}

function getSnapshot(): readonly NavHistoryEntry[] {
  return getNavHistorySnapshot();
}

function getServerSnapshot(): readonly NavHistoryEntry[] {
  return SERVER_SNAPSHOT;
}

export interface NavBackFallback {
  href: string;
  label?: string;
}

export function useNavBack(fallback: NavBackFallback, options?: { disableHistory?: boolean }) {
  const router = useRouter();
  const stack = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const resolved = useMemo(() => {
    const fb: NavHistoryEntry = {
      href: fallback.href,
      label: fallback.label ?? "Quay lại",
    };
    if (options?.disableHistory) return fb;
    return resolveNavBack(fb, stack);
  }, [fallback.href, fallback.label, options?.disableHistory, stack]);

  const fromHistory = !options?.disableHistory && stack.length >= 2;

  const navigateBack = useCallback(
    (event?: { preventDefault: () => void }) => {
      if (!fromHistory) return false;
      event?.preventDefault();
      popNavHistory();
      notifyNavHistoryChange();
      router.push(resolved.href);
      return true;
    },
    [fromHistory, resolved.href, router],
  );

  return {
    href: resolved.href,
    label: resolved.label,
    fromHistory,
    navigateBack,
  };
}
