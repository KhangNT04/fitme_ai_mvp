export function scrollToTop(behavior: ScrollBehavior = "smooth") {
  window.scrollTo({ top: 0, left: 0, behavior });
}

export function normalizeNavPath(path: string): string {
  return path.split("?")[0].replace(/\/$/, "") || "/";
}

export function isSameNavTarget(pathname: string, href: string): boolean {
  return normalizeNavPath(pathname) === normalizeNavPath(href);
}

export function handleSamePageNavClick(
  e: { preventDefault: () => void },
  pathname: string,
  href: string,
) {
  if (isSameNavTarget(pathname, href)) {
    e.preventDefault();
    scrollToTop();
  }
}
