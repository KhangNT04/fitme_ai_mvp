"use client";

import { useQuery } from "@tanstack/react-query";
import { rewardsApi } from "@/services/rewards-api";
import { useAuthStore } from "@/stores/auth-store";
import { DEFAULT_SHARE_REWARD_FITKEN } from "@/utils/constants";

/** Fitken granted per social share, as configured on the backend. */
export function useShareRewardAmount(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { data } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: () => rewardsApi.getSummary(),
    enabled: isAuthenticated,
  });
  return data?.share.rewardAmount ?? DEFAULT_SHARE_REWARD_FITKEN;
}
