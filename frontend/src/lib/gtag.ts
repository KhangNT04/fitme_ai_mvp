export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "";

type Gtag = (command: "event", name: string, params?: Record<string, unknown>) => void;

/** Sends a GA4 event when GA is configured; no-op otherwise. */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  gtag?.("event", name, params);
}
