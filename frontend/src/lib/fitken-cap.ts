import type { RewardCapInfo } from "@/types/rewards";

export interface CappedReward extends RewardCapInfo {
  rewardGranted: number;
}

/** True when the free-Fitken cap reduced (or blocked) a reward the user had earned. */
export function isRewardCapped(reward: CappedReward): boolean {
  if (reward.rewardCapped != null) return reward.rewardCapped;
  return reward.rewardIntended != null && reward.rewardGranted < reward.rewardIntended;
}

/**
 * Explains a capped reward, or returns null when the full reward was credited:
 * - partially credited: "Ví đã đạt trần 50 Fitken miễn phí nên chỉ cộng 2 Fitken"
 * - nothing credited: "Ví đã đầy, không cộng thêm"
 */
export function fitkenCapMessage(reward: CappedReward): string | null {
  if (!isRewardCapped(reward)) return null;
  if (reward.rewardGranted <= 0) return "Ví đã đầy, không cộng thêm";
  const cap = reward.maxBalance ?? null;
  return cap != null
    ? `Ví đã đạt trần ${cap} Fitken miễn phí nên chỉ cộng ${reward.rewardGranted} Fitken`
    : `Ví đã đạt trần Fitken miễn phí nên chỉ cộng ${reward.rewardGranted} Fitken`;
}

/** "12 / 50 Fitken miễn phí" hint shown next to the balance. */
export function fitkenCapProgressLabel(balance: number, maxBalance: number | null | undefined): string | null {
  if (maxBalance == null || maxBalance <= 0) return null;
  return `${balance} / ${maxBalance} Fitken miễn phí`;
}

export function isAtFreeFitkenCap(balance: number, maxBalance: number | null | undefined): boolean {
  return maxBalance != null && balance >= maxBalance;
}
