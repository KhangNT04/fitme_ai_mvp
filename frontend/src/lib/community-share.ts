import { SITE_URL } from "./site-config";

/**
 * Helpers for publishing an outfit to the community and sharing its public link.
 * Pure functions live here so they can be unit tested without a browser.
 */

/** Absolute public link of a community post, e.g. `https://fitme.app/outfit/a1b2c3d4`. */
export function communityShareUrl(shareCode: string): string {
  const code = shareCode.trim();
  if (!code) return SITE_URL;
  return `${SITE_URL}/outfit/${code}`;
}

/** Caption pre-filled for the social post, so the user only has to paste it. */
export function communityShareCaption(options?: {
  authorName?: string | null;
  brandNames?: string[] | null;
  styleLabel?: string | null;
}): string {
  const brandNames = (options?.brandNames ?? []).filter(Boolean);
  const parts: string[] = ["Outfit mình vừa thử trên FitMe ✨"];
  if (brandNames.length > 0) {
    parts.push(`Phối đồ ${brandNames.slice(0, 3).join(" + ")}`);
  }
  if (options?.styleLabel) {
    parts.push(`Style: ${options.styleLabel}`);
  }
  parts.push("#FitMe #AItryon #thờitrang");
  return parts.join("\n");
}

/** Copy text to the clipboard, falling back to a hidden textarea when the API is unavailable. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path (permissions can be denied).
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

/** Share the post link and caption through the OS share sheet when available. */
export async function shareCommunityPost(options: {
  url: string;
  title: string;
  text: string;
}): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url: options.url, title: options.title, text: options.text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed";
      }
      // Fall back to copying the link when the share sheet refuses the payload.
    }
  }
  const copied = await copyToClipboard(options.url);
  return copied ? "copied" : "failed";
}
