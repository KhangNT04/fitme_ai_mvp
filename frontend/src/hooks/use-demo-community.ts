"use client";

import { useCallback, useSyncExternalStore } from "react";
import { resolveCommunityDataset, setCommunityDataset } from "@/lib/demo-data";

/**
 * Subscribes to the runtime demo switch.
 *
 * `useSyncExternalStore` keeps the component in sync with `localStorage` without a setState in an
 * effect body, and it works during SSR by reading the server snapshot.
 */

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string {
  return resolveCommunityDataset();
}

/**
 * The server has no `localStorage`, so it falls back to the env-driven default.
 *
 * It must match what the client resolves on the first render, otherwise React reports a
 * hydration mismatch.
 */
function getServerSnapshot(): string {
  return resolveCommunityDataset();
}

/** True when the community feed should show the local demo dataset. */
export function useDemoCommunityEnabled(): boolean {
  const dataset = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return dataset === "community";
}

/** Flips the demo feed on or off and notifies the subscribers. */
export function useToggleDemoCommunity(): (next: boolean) => void {
  return useCallback((next: boolean) => {
    setCommunityDataset(next ? "community" : "none");
    emit();
  }, []);
}
