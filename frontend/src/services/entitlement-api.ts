import apiClient, { unwrap } from "./api-client";

export type ConsumerPlan = "FREE" | "PLUS";
export type OutfitCoherenceMode = "OFF" | "PREFER" | "STRICT";

export interface ConsumerEntitlement {
  plan: ConsumerPlan;
  coherenceMode: OutfitCoherenceMode;
  plus: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
}

interface BackendEntitlement {
  plan: string;
  coherenceMode: string;
  plus: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
}

function mapEntitlement(data: BackendEntitlement): ConsumerEntitlement {
  return {
    plan: data.plan === "PLUS" ? "PLUS" : "FREE",
    coherenceMode: (data.coherenceMode || "OFF") as OutfitCoherenceMode,
    plus: Boolean(data.plus),
    label: data.label || (data.plus ? "FitMe Plus" : "FitMe Free"),
    mixPolicy: data.mixPolicy || "",
    upsellMessage: data.upsellMessage,
  };
}

export const entitlementApi = {
  getCurrent: async (): Promise<ConsumerEntitlement> => {
    const res = await apiClient.get("/me/entitlement");
    return mapEntitlement(unwrap(res));
  },
  /** Alias used by pricing / upsell banners. */
  get: async (): Promise<ConsumerEntitlement> => entitlementApi.getCurrent(),
  setPlan: async (
    plan: ConsumerPlan,
    coherenceMode?: OutfitCoherenceMode,
  ): Promise<ConsumerEntitlement> => {
    const res = await apiClient.put("/me/entitlement", {
      plan,
      ...(coherenceMode ? { coherenceMode } : {}),
    });
    return mapEntitlement(unwrap(res));
  },
};
