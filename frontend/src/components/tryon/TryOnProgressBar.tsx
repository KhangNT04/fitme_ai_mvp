"use client";

import type { TryOnInputMode } from "@/types/tryon";
import type { TryOnPollPhase } from "@/hooks/use-tryon-poll";

type TryOnProgressBarProps = {
  phase: TryOnPollPhase;
  elapsedMs: number;
  inputMode: TryOnInputMode;
  timeoutMs?: number;
};

const PHASE_LABELS: Record<TryOnInputMode, Record<TryOnPollPhase, string>> = {
  USER_PHOTO: {
    idle: "Đang chuẩn bị...",
    starting: "Đang gửi yêu cầu thử mặc AI...",
    polling: "AI đang ghép trang phục lên ảnh của bạn...",
    completed: "Hoàn tất!",
    failed: "Không tạo được preview",
    timeout: "Hết thời gian chờ",
  },
  AVATAR: {
    idle: "Đang chuẩn bị...",
    starting: "Đang tạo preview avatar...",
    polling: "Đang xử lý preview...",
    completed: "Hoàn tất!",
    failed: "Không tạo được preview",
    timeout: "Hết thời gian chờ",
  },
  OUTFIT_BOARD_ONLY: {
    idle: "Đang chuẩn bị...",
    starting: "Đang tạo bảng phối đồ...",
    polling: "Đang xử lý minh họa...",
    completed: "Hoàn tất!",
    failed: "Không tạo được preview",
    timeout: "Hết thời gian chờ",
  },
};

export function TryOnProgressBar({
  phase,
  elapsedMs,
  inputMode,
  timeoutMs = 120_000,
}: TryOnProgressBarProps) {
  const labels = PHASE_LABELS[inputMode] ?? PHASE_LABELS.OUTFIT_BOARD_ONLY;
  const label = labels[phase] ?? labels.polling;
  const progress = Math.min(100, Math.round((elapsedMs / timeoutMs) * 100));
  const indeterminate = phase === "starting" || phase === "polling";

  return (
    <div className="w-full max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full bg-primary transition-all duration-500 ${
            indeterminate ? "animate-pulse" : ""
          }`}
          style={{ width: indeterminate ? `${Math.max(progress, 8)}%` : "100%" }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {Math.round(elapsedMs / 1000)}s / {Math.round(timeoutMs / 1000)}s
      </p>
    </div>
  );
}
