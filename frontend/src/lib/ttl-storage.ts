const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface TtlEnvelope<T> {
  data: T;
  savedAt: number;
}

export function isTtlExpired(savedAt: number, ttlMs: number = THIRTY_DAYS_MS): boolean {
  return Date.now() - savedAt > ttlMs;
}

export function readTtlStorage<T>(key: string, ttlMs: number = THIRTY_DAYS_MS): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TtlEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number" || parsed.data == null) {
      localStorage.removeItem(key);
      return null;
    }
    if (isTtlExpired(parsed.savedAt, ttlMs)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeTtlStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  const envelope: TtlEnvelope<T> = { data, savedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(envelope));
}

export function clearTtlStorage(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export { THIRTY_DAYS_MS };
