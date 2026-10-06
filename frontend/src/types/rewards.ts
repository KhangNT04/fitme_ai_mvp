export interface CheckinStatus {
  checkedInToday: boolean;
  currentStreak: number;
  streakTarget: number;
  daysUntilNextReward: number;
  rewardAmount: number;
  recentDays: string[];
}

/** Present on reward responses when the free-Fitken cap may have reduced the grant. */
export interface RewardCapInfo {
  rewardIntended?: number | null;
  rewardCapped?: boolean | null;
  maxBalance?: number | null;
}

export interface ShareClaimDto extends RewardCapInfo {
  id: string;
  userId: string;
  postUrl: string;
  platform: string;
  status: string;
  rewardGranted: number;
  tryOnRequestId?: string;
  galleryImageId?: string;
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ShareStatus {
  rewardAmount: number;
  dailyLimit: number;
  remainingToday: number;
  allowedDomains: string[];
  recentClaims: ShareClaimDto[];
}

export interface ReviewRewardStatus {
  rewardAmount: number;
  minContentLength: number;
  rewardedCount: number;
  dailyLimit: number;
  remainingToday: number;
}

export interface RewardsSummaryDto {
  balance: number;
  /** Free Fitken cap; rewards stop adding once the balance reaches it. */
  maxBalance: number;
  checkin: CheckinStatus;
  share: ShareStatus;
  review: ReviewRewardStatus;
}

export interface CheckinResultDto extends RewardCapInfo {
  checkedInToday: boolean;
  currentStreak: number;
  rewardGranted: number;
  balance: number;
}

export interface ShareClaimRequest {
  postUrl: string;
  tryOnRequestId?: string;
  galleryImageId?: string;
}
