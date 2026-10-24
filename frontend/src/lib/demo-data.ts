/**
 * Demo-data switch.
 *
 * The production backend only gained the community API recently, so a deployed frontend can be
 * newer than the running backend. To keep the app demoable in that window, the community feed
 * falls back to a local, curated dataset.
 *
 * Rules that keep this safe:
 * - Off by default. Opt in with `NEXT_PUBLIC_DEMO_DATA=1` when building the demo build.
 * - The local switch (`fitme_demo_data`) lets a tester turn the demo feed on or off at runtime,
 *   without a rebuild. It only has an effect when the build opted in.
 * - It never fabricates a write: publishing still requires the real API, so a demo build cannot
 *   pretend a user published something.
 * - Every image and product in the fallback set is a real catalog item.
 */

const RAW_FLAG = process.env.NEXT_PUBLIC_DEMO_DATA;

/** True when this build is allowed to use the local demo dataset. */
export const DEMO_DATA_ENABLED = RAW_FLAG === "1" || RAW_FLAG === "true";

/** Local key for the runtime demo switch. */
const DEMO_STORAGE_KEY = "fitme_demo_data";

export type DemoDataset = "community" | "none";

function readStoredDataset(): DemoDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored === "community" || stored === "none") return stored;
    return null;
  } catch {
    return null;
  }
}

/**
 * Which dataset the community feed should use right now.
 *
 * With the build opted in, the demo feed is on by default; the local switch overrides it.
 */
export function resolveCommunityDataset(): DemoDataset {
  if (!DEMO_DATA_ENABLED) return "none";
  return readStoredDataset() ?? "community";
}

/** Persists the runtime switch. Returns the value that was stored. */
export function setCommunityDataset(dataset: DemoDataset): DemoDataset {
  if (typeof window === "undefined") return dataset;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, dataset);
  } catch {
    // Private-mode browsers reject writes; the in-memory value still applies for this session.
  }
  return dataset;
}

/** True when the demo feed should replace the API response. */
export function shouldUseDemoCommunity(): boolean {
  return resolveCommunityDataset() === "community";
}
