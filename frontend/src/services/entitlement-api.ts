import apiClient, { unwrap } from "./api-client";

export type ConsumerPlan = "FREE" | "PREMIUM";
export type OutfitCoherenceMode = "OFF" | "PREFER" | "STRICT";

export const PREMIUM_LABEL = "FitMe Premium";
export const FREE_LABEL = "FitMe Free";

export interface ConsumerEntitlement {
  plan: ConsumerPlan;
  coherenceMode: OutfitCoherenceMode;
  premium: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
  premiumPriceVnd?: number | null;
  premiumMonthlyFitken?: number | null;
}

interface BackendEntitlement {
  plan: string;
  coherenceMode: string;
  premium?: boolean;
  /** @deprecated legacy alias of `premium`. */
  pro?: boolean;
  label: string;
  mixPolicy: string;
  upsellMessage?: string | null;
  premiumPriceVnd?: number | null;
  premiumMonthlyFitken?: number | null;
}

/** Accepts the legacy PRO / PLUS plan values still found in old payloads. */
export function normalizeConsumerPlan(plan: string | null | undefined): ConsumerPlan {
  const value = (plan ?? "").toUpperCase();
  return value === "PREMIUM" || value === "PRO" || value === "PLUS" ? "PREMIUM" : "FREE";
}

export function mapEntitlement(data: BackendEntitlement): ConsumerEntitlement {
  const premium = Boolean(data.premium ?? data.pro) || normalizeConsumerPlan(data.plan) === "PREMIUM";
  return {
    plan: premium ? "PREMIUM" : "FREE",
    coherenceMode: (data.coherenceMode || "OFF") as OutfitCoherenceMode,
    premium,
    label: data.label || (premium ? PREMIUM_LABEL : FREE_LABEL),
    mixPolicy: data.mixPolicy || "",
    upsellMessage: data.upsellMessage,
    premiumPriceVnd: data.premiumPriceVnd ?? null,
    premiumMonthlyFitken: data.premiumMonthlyFitken ?? null,
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
