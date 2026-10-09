import type { QueryClient } from "@tanstack/react-query";

export function adminProductQueryKey(id: string) {
  return ["admin-product", id] as const;
}

/** Refresh every admin view that reflects a product's moderation status. */
export function invalidateProductModeration(queryClient: QueryClient, productId: string): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] }),
    queryClient.invalidateQueries({ queryKey: adminProductQueryKey(productId) }),
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
  ]).then(() => undefined);
}
