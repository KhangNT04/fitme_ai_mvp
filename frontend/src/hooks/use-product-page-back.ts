"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  getNavHistorySnapshot,
  type NavHistoryEntry,
} from "@/lib/nav-history";
import {
  resolveProductPageBack,
  TRYON_FROM_PARAM,
  AI_RESULT_FROM_PARAM,
  RECOMMENDATION_PARAM,
} from "@/lib/nav-context";

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

/** Back target for product detail — hub labels instead of wizard step names. */
export function useProductPageBack(): NavHistoryEntry {
  const searchParams = useSearchParams();
  const fromTryOn = searchParams.get("from") === TRYON_FROM_PARAM;
  const fromAiResult = searchParams.get("from") === AI_RESULT_FROM_PARAM;
  const recommendationId = searchParams.get(RECOMMENDATION_PARAM);
  const stack = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(
    () =>
      resolveProductPageBack(stack, {
        fromTryOn,
        fromAiResult,
        recommendationId,
      }),
    [fromAiResult, fromTryOn, recommendationId, stack],
  );
}
