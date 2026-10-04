import apiClient, { unwrap } from "./api-client";
import { RewardsSummaryDto, CheckinResultDto, ShareClaimRequest, ShareClaimDto } from "@/types";

export const rewardsApi = {
  getSummary: async (): Promise<RewardsSummaryDto> => {
    const res = await apiClient.get("/rewards");
    return unwrap(res);
  },
  checkin: async (): Promise<CheckinResultDto> => {
    const res = await apiClient.post("/rewards/checkin");
    return unwrap(res);
  },
  claimShare: async (data: ShareClaimRequest): Promise<ShareClaimDto> => {
    const res = await apiClient.post("/rewards/share", data);
    return unwrap(res);
  },
};
