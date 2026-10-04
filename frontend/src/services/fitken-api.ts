import apiClient, { unwrap } from "./api-client";
import { FitkenWalletResponse, FitkenLedgerItemDto } from "@/types";

export const fitkenApi = {
  getWallet: async (): Promise<FitkenWalletResponse> => {
    const res = await apiClient.get("/me/fitken");
    return unwrap(res);
  },
  getLedger: async (page = 0, size = 20): Promise<{ items: FitkenLedgerItemDto[]; totalCount: number }> => {
    const res = await apiClient.get("/me/fitken/ledger", { params: { page, size } });
    return unwrap(res);
  },
};
