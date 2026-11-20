import { resolveImageSrc } from "@/lib/media-url";

const prefetched = new Set<string>();

/**
 * Warm the browser HTTP cache for catalog thumbnails so Discover scroll doesn't wait on fetch.
 * Concurrency-limited; safe to call repeatedly (deduped).
 */
export function prefetchImages(urls: Array<string | null | undefined>, concurrency = 6): void {
  if (typeof window === "undefined") return;

  const queue = [...new Set(
    urls
      .map((url) => resolveImageSrc(url))
      .filter((url) => url.startsWith("http") || url.startsWith("/"))
      .filter((url) => !prefetched.has(url)),
  )];

  if (queue.length === 0) return;
  for (const url of queue) prefetched.add(url);

  let cursor = 0;
  const workers = Math.min(Math.max(concurrency, 1), queue.length);

  const pump = () => {
    if (cursor >= queue.length) return;
    const url = queue[cursor++];
    const img = new window.Image();
    const advance = () => pump();
    img.onload = advance;
    img.onerror = advance;
    img.decoding = "async";
    img.src = url;
  };

  const start = () => {
    for (let i = 0; i < workers; i++) pump();
  };

  const ric = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof ric === "function") {
    ric(() => start(), { timeout: 1200 });
  } else {
    globalThis.setTimeout(start, 120);
  }
}
