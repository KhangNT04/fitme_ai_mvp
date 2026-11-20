import apiClient, { unwrap } from "./api-client";

export interface ShopChatThread {
  id: string;
  brandId: string;
  brandName: string;
  userId: string;
  userDisplayName: string;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  status: "OPEN" | "CLOSED" | "LOCKED";
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ShopChatMessage {
  id: string;
  threadId: string;
  senderUserId?: string;
  senderRole: "USER" | "BRAND" | "ADMIN" | "SYSTEM";
  senderDisplayName?: string;
  body: string;
  createdAt: string;
}

export interface ShopChatThreadDetail {
  thread: ShopChatThread;
  messages: ShopChatMessage[];
}

export interface ShopChatThreadPage {
  items: ShopChatThread[];
  page: number;
  size: number;
  total: number;
}

function toPage(data: Partial<ShopChatThreadPage> | null, page: number, size: number): ShopChatThreadPage {
  return {
    items: data?.items ?? [],
    page: data?.page ?? page,
    size: data?.size ?? size,
    total: data?.total ?? 0,
  };
}

export const shopChatApi = {
  listMine: async (page = 0, size = 20): Promise<ShopChatThreadPage> => {
    const res = await apiClient.get("/me/shop-chat/threads", { params: { page, size } });
    return toPage(unwrap(res) as Partial<ShopChatThreadPage> | null, page, size);
  },
  open: async (body: {
    brandId?: string;
    productId?: string;
    tryOnRequestId?: string;
    communityPostId?: string;
    firstMessage?: string;
  }): Promise<ShopChatThreadDetail> => {
    const res = await apiClient.post("/me/shop-chat/threads", body);
    return unwrap(res) as ShopChatThreadDetail;
  },
  getMine: async (threadId: string): Promise<ShopChatThreadDetail> => {
    const res = await apiClient.get(`/me/shop-chat/threads/${threadId}`);
    return unwrap(res) as ShopChatThreadDetail;
  },
  sendMine: async (threadId: string, body: string): Promise<ShopChatMessage> => {
    const res = await apiClient.post(`/me/shop-chat/threads/${threadId}/messages`, { body });
    return unwrap(res) as ShopChatMessage;
  },

  listBrand: async (page = 0, size = 20): Promise<ShopChatThreadPage> => {
    const res = await apiClient.get("/brand/inbox/threads", { params: { page, size } });
    return toPage(unwrap(res) as Partial<ShopChatThreadPage> | null, page, size);
  },
  getBrand: async (threadId: string): Promise<ShopChatThreadDetail> => {
    const res = await apiClient.get(`/brand/inbox/threads/${threadId}`);
    return unwrap(res) as ShopChatThreadDetail;
  },
  sendBrand: async (threadId: string, body: string): Promise<ShopChatMessage> => {
    const res = await apiClient.post(`/brand/inbox/threads/${threadId}/messages`, { body });
    return unwrap(res) as ShopChatMessage;
  },
  setBrandStatus: async (threadId: string, status: string): Promise<void> => {
    const res = await apiClient.post(`/brand/inbox/threads/${threadId}/status`, { status });
    unwrap(res);
  },

  listAdmin: async (page = 0, size = 20): Promise<ShopChatThreadPage> => {
    const res = await apiClient.get("/admin/shop-chat/threads", { params: { page, size } });
    return toPage(unwrap(res) as Partial<ShopChatThreadPage> | null, page, size);
  },
  getAdmin: async (threadId: string): Promise<ShopChatThreadDetail> => {
    const res = await apiClient.get(`/admin/shop-chat/threads/${threadId}`);
    return unwrap(res) as ShopChatThreadDetail;
  },
  sendAdmin: async (threadId: string, body: string): Promise<ShopChatMessage> => {
    const res = await apiClient.post(`/admin/shop-chat/threads/${threadId}/messages`, { body });
    return unwrap(res) as ShopChatMessage;
  },
  setAdminStatus: async (threadId: string, status: string): Promise<void> => {
    const res = await apiClient.post(`/admin/shop-chat/threads/${threadId}/status`, { status });
    unwrap(res);
  },
};
