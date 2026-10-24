import { useQuery } from "@tanstack/react-query";
import apiClient, { unwrap } from "@/services/api-client";

export interface PricingVisibility {
  /** False when the admin hid the paid consumer plans; hide every upgrade CTA. */
  showPaid: boolean;
}

export const PRICING_VISIBILITY_QUERY_KEY = ["pricing-visibility"] as const;

/** Admin-controlled visibility of the paid consumer plans. */
export const pricingApi = {
  getVisibility: async (): Promise<PricingVisibility> => {
    const res = await apiClient.get("/pricing/visibility");
    return unwrap(res);
  },
};

/**
 * True when the paid plans may be shown. Until the flag arrives the plans are shown, so a slow
 * network never hides the pricing page.
 */
export function usePricingVisibility(): { showPaid: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: PRICING_VISIBILITY_QUERY_KEY,
    queryFn: pricingApi.getVisibility,
    staleTime: 60_000,
  });
  return { showPaid: data?.showPaid ?? true, isLoading };
}
