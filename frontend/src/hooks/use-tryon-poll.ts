"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tryonApi } from "@/services/tryon-api";
import { getUserErrorMessage } from "@/lib/user-error-message";
import type { TryOnResult, TryOnStatus } from "@/types/tryon";

export type TryOnPollPhase = "idle" | "starting" | "polling" | "completed" | "failed" | "timeout";

export type UseTryOnPollOptions = {
  requestId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
  onCompleted?: (result: TryOnResult) => void;
};

export type UseTryOnPollResult = {
  phase: TryOnPollPhase;
  status: TryOnStatus | null;
  result: TryOnResult | null;
  error: string | null;
  elapsedMs: number;
  retry: () => void;
};

const DEFAULT_POLL_MS = 2500;
const DEFAULT_TIMEOUT_MS = 120_000;

export function useTryOnPoll({
  requestId,
  enabled = true,
  pollIntervalMs = DEFAULT_POLL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onCompleted,
}: UseTryOnPollOptions): UseTryOnPollResult {
  const [phase, setPhase] = useState<TryOnPollPhase>("idle");
  const [status, setStatus] = useState<TryOnStatus | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [runToken, setRunToken] = useState(0);

  const startedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const retry = useCallback(() => {
    startedRef.current = false;
    setPhase("idle");
    setStatus(null);
    setResult(null);
    setError(null);
    setElapsedMs(0);
    setRunToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !requestId) {
      return;
    }
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let elapsedTimer: ReturnType<typeof setInterval> | null = null;
    const startedAt = Date.now();

    elapsedTimer = setInterval(() => {
      if (!cancelled) {
        setElapsedMs(Date.now() - startedAt);
      }
    }, 500);

    const finish = (nextPhase: TryOnPollPhase, message?: string) => {
      if (cancelled) return;
      if (pollTimer) clearTimeout(pollTimer);
      if (elapsedTimer) clearInterval(elapsedTimer);
      setPhase(nextPhase);
      if (message) setError(message);
    };

    const pollUntilDone = async (initial: TryOnResult) => {
      let latest = initial;
      setStatus(latest.status);
      setResult(latest);

      if (latest.status === "COMPLETED") {
        finish("completed");
        onCompletedRef.current?.(latest);
        return;
      }
      if (latest.status === "FAILED") {
        finish("failed", latest.errorMessage ?? "Tạo preview thất bại.");
        return;
      }

      setPhase("polling");

      const tick = async () => {
        if (cancelled) return;
        if (Date.now() - startedAt > timeoutMs) {
          finish("timeout", "Quá thời gian chờ tạo preview. Vui lòng thử lại.");
          return;
        }

        try {
          latest = await tryonApi.getById(requestId);
          setStatus(latest.status);
          setResult(latest);

          if (latest.status === "COMPLETED") {
            finish("completed");
            onCompletedRef.current?.(latest);
            return;
          }
          if (latest.status === "FAILED") {
            finish("failed", latest.errorMessage ?? "Tạo preview thất bại.");
            return;
          }
        } catch (e: unknown) {
          finish("failed", getUserErrorMessage(e, "Không thể kiểm tra trạng thái preview."));
          return;
        }

        pollTimer = setTimeout(() => {
          void tick();
        }, pollIntervalMs);
      };

      pollTimer = setTimeout(() => {
        void tick();
      }, pollIntervalMs);
    };

    const run = async () => {
      setPhase("starting");
      try {
        const generated = await tryonApi.generate(requestId);
        await pollUntilDone(generated);
      } catch (e: unknown) {
        startedRef.current = false;
        finish("failed", getUserErrorMessage(e, "Tạo preview thất bại. Vui lòng thử lại."));
      }
    };

    void run();

    return () => {
      cancelled = true;
      startedRef.current = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (elapsedTimer) clearInterval(elapsedTimer);
    };
  }, [enabled, requestId, pollIntervalMs, timeoutMs, runToken]);

  return { phase, status, result, error, elapsedMs, retry };
}
