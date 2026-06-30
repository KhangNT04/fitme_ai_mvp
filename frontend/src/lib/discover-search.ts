export const DISCOVER_SEARCH_HASH = "#discover-search";
export const DISCOVER_SEARCH_FOCUS_EVENT = "discover-search-focus";

export function isDiscoverSearchInputVisible(el: HTMLInputElement): boolean {
  if (el.disabled || el.type === "hidden") return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  if (el.closest(".max-h-0")) return false;

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function focusDiscoverSearchInput(): boolean {
  const input = [...document.querySelectorAll<HTMLInputElement>("[data-discover-search]")].find(
    isDiscoverSearchInputVisible,
  );
  if (!input) return false;
  input.focus({ preventScroll: true });
  return document.activeElement === input;
}

const FOCUS_RETRY_MS = [50, 200, 400, 650, 900];

export function scheduleDiscoverSearchFocus() {
  for (const delay of FOCUS_RETRY_MS) {
    window.setTimeout(() => focusDiscoverSearchInput(), delay);
  }
}

/** Scroll to top of discover and focus the visible search field. */
export function openDiscoverSearch(behavior: ScrollBehavior = "smooth") {
  window.scrollTo({ top: 0, left: 0, behavior });

  if (window.location.hash !== DISCOVER_SEARCH_HASH) {
    window.location.hash = DISCOVER_SEARCH_HASH;
  }

  window.dispatchEvent(new Event(DISCOVER_SEARCH_FOCUS_EVENT));
  scheduleDiscoverSearchFocus();
}
