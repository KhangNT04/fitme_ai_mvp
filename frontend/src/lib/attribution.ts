/** First-touch marketing attribution (UTM / referrer), stored locally and sent once at signup. */

const STORAGE_KEY = "fitme_attribution";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SignupAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

interface StoredAttribution extends SignupAttribution {
  capturedAt: number;
}

function clean(value: string | null | undefined, max: number): string | undefined {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function externalReferrer(referrer: string, currentHost: string): URL | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname === currentHost ? null : url;
  } catch {
    return null;
  }
}

/** Pure helper (exported for tests): derives attribution from a landing URL and document.referrer. */
export function attributionFromLanding(href: string, referrer: string): SignupAttribution | null {
  const url = new URL(href);
  const params = url.searchParams;
  const ref = externalReferrer(referrer, url.hostname);
  const utmSource = clean(params.get("utm_source"), 100);
  if (!utmSource && !ref) return null;
  return {
    utmSource: utmSource ?? clean(ref?.hostname.replace(/^www\./, ""), 100),
    utmMedium: clean(params.get("utm_medium"), 100) ?? (utmSource ? undefined : "referral"),
    utmCampaign: clean(params.get("utm_campaign"), 150),
    referrer: ref ? clean(`${ref.origin}${ref.pathname}`, 255) : undefined,
  };
}

function readStored(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed.capturedAt || Date.now() - parsed.capturedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Records the first marketing touch of this browser; later visits never overwrite it. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  if (readStored()) return;
  const found = attributionFromLanding(window.location.href, document.referrer);
  if (!found) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...found, capturedAt: Date.now() }));
  } catch {
    // Storage disabled (private mode) — attribution is best-effort.
  }
}

export function getSignupAttribution(): SignupAttribution {
  if (typeof window === "undefined") return {};
  const stored = readStored();
  if (!stored) return {};
  return {
    utmSource: stored.utmSource,
    utmMedium: stored.utmMedium,
    utmCampaign: stored.utmCampaign,
    referrer: stored.referrer,
  };
}
