import apiClient, { unwrap } from "./api-client";
import type { AnonymousSession } from "@/types/session";

export const sessionApi = {
  createAnonymous: async (): Promise<AnonymousSession> => {
    const res = await apiClient.post("/sessions/anonymous");
    return unwrap(res);
  },
  getCurrent: async (): Promise<AnonymousSession> => {
    const res = await apiClient.get("/sessions/current");
    return unwrap(res);
  },
  linkToUser: async (sessionToken: string): Promise<void> => {
    await apiClient.post("/sessions/link-to-user", { sessionToken });
  },
};
