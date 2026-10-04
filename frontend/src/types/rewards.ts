export interface CheckinStatus {
  checkedInToday: boolean;
  currentStreak: number;
  streakTarget: number;
  daysUntilNextReward: number;
  rewardAmount: number;
  recentDays: string[];
}

export interface ShareClaimDto {
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
  checkin: CheckinStatus;
  share: ShareStatus;
  review: ReviewRewardStatus;
}

export interface CheckinResultDto {
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
