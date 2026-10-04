import apiClient, { unwrap } from "./api-client";
import type { Address, AddressInput } from "@/types/commerce";

export const ADDRESSES_QUERY_KEY = ["addresses"] as const;

export const addressApi = {
  list: async (): Promise<Address[]> => {
    const res = await apiClient.get("/me/addresses");
    return unwrap(res);
  },
  create: async (input: AddressInput): Promise<Address> => {
    const res = await apiClient.post("/me/addresses", input);
    return unwrap(res);
  },
  update: async (id: string, input: AddressInput): Promise<Address> => {
    const res = await apiClient.put(`/me/addresses/${id}`, input);
    return unwrap(res);
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/me/addresses/${id}`);
  },
};
