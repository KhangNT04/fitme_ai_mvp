"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi, CART_QUERY_KEY } from "@/services/cart-api";

/** Cart query — same `["cart"]` key as the header badge. */
export function useCartQuery(enabled = true) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartApi.get(),
    enabled,
  });
}

export function useInvalidateCart() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
}
