/** Share rewards are credited as soon as the link is accepted; admins can only revoke afterwards. */
export function shareClaimSuccessMessage(rewardGranted: number): string {
  if (rewardGranted > 0) {
    return `Đã cộng ${rewardGranted} Fitken vào ví! Admin có thể thu hồi nếu bài chia sẻ không hợp lệ.`;
  }
  return "Đã ghi nhận link chia sẻ.";
}
