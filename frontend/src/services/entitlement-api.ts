import apiClient, { unwrap } from "./api-client";

export type ConsumerPlan = "FREE" | "PRO";
export type OutfitCoherenceMode = "OFF" | "PREFER" | "STRICT";

export interface ConsumerEntitlement {
  plan: ConsumerPlan;
  coherenceMode: OutfitCoherenceMode;
  pro: boolean;
  plus: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
}

interface BackendEntitlement {
  plan: string;
  coherenceMode: string;
  pro: boolean;
  plus: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
}

function mapEntitlement(data: BackendEntitlement): ConsumerEntitlement {
  return {
    plan: data.plan === "PRO" ? "PRO" : "FREE",
    coherenceMode: (data.coherenceMode || "OFF") as OutfitCoherenceMode,
    pro: Boolean(data.pro),
    plus: Boolean(data.plus),
    label: data.label || (data.pro ? "FitMe Pro" : "FitMe Free"),
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
};
