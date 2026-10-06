import { fitkenCapMessage, type CappedReward } from "./fitken-cap";

/** Share rewards are credited as soon as the link is accepted; admins can only revoke afterwards. */
export function shareClaimSuccessMessage(reward: number | CappedReward): string {
  const claim: CappedReward = typeof reward === "number" ? { rewardGranted: reward } : reward;
  const capMessage = fitkenCapMessage(claim);
  if (capMessage && claim.rewardGranted <= 0) {
    return `Đã ghi nhận link chia sẻ. ${capMessage}.`;
  }
  if (claim.rewardGranted > 0) {
    const credited = capMessage ?? `Đã cộng ${claim.rewardGranted} Fitken vào ví!`;
    return `${credited}${capMessage ? "." : ""} Admin có thể thu hồi nếu bài chia sẻ không hợp lệ.`;
  }
  return "Đã ghi nhận link chia sẻ.";
}
