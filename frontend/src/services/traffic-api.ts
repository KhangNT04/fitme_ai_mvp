import apiClient from "./api-client";

export const VISITOR_ID_KEY = "fitme_visitor_id";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Anonymous per-browser id so the admin traffic report can count unique visitors. */
export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const id = randomUuid();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return randomUuid();
  }
}

/** Portal pages are staff tools, not storefront traffic. */
export function isTrackedPath(pathname: string): boolean {
  return !/^\/(admin|brand)(\/|$)/.test(pathname);
}

export const trafficApi = {
  /** Best-effort page-view beacon; never surfaces errors. */
  recordVisit: async (path: string): Promise<void> => {
    try {
      await apiClient.post("/analytics/visit", { visitorId: getVisitorId(), path });
    } catch {
      // Analytics must not affect browsing.
    }
  },
};
