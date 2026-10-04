import apiClient, { unwrap } from "./api-client";
import type { UserVoucher } from "@/types/commerce";

export const voucherApi = {
  getMyVouchers: async (): Promise<UserVoucher[]> => {
    const res = await apiClient.get("/me/vouchers");
    return unwrap(res);
  },
};
