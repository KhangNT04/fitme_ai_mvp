import { useQuery } from "@tanstack/react-query";
import apiClient, { unwrap } from "@/services/api-client";

export interface PricingVisibility {
  /** False when the admin hid the paid consumer plans; hide every upgrade CTA. */
  showPaid: boolean;
}

export const PRICING_VISIBILITY_QUERY_KEY = ["pricing-visibility"] as const;

/** The paid plans are shown by default, so a failing flag never hides the pricing page. */
const DEFAULT_VISIBILITY: PricingVisibility = { showPaid: true };

export const pricingApi = {
  getVisibility: async (): Promise<PricingVisibility> => {
    try {
      const res = await apiClient.get("/pricing/visibility");
      const data = unwrap(res) as Partial<PricingVisibility> | null;
      return { showPaid: data?.showPaid ?? DEFAULT_VISIBILITY.showPaid };
    } catch {
      // The flag endpoint can be missing on an older backend. Showing the plans is the safer
      // default: the admin switch still hides them once the backend supports it.
      return DEFAULT_VISIBILITY;
    }
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
    retry: false,
  });
  return { showPaid: data?.showPaid ?? DEFAULT_VISIBILITY.showPaid, isLoading };
}
