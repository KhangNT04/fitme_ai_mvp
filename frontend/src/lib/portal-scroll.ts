/** Survives portal page remounts so sidebar / window scroll stay put between nav clicks. */

const sidebarScrollByKind: Record<"admin" | "brand", number> = {
  admin: 0,
  brand: 0,
};

let windowScrollY = 0;

export function getPortalSidebarScroll(kind: "admin" | "brand"): number {
  return sidebarScrollByKind[kind];
}

export function setPortalSidebarScroll(kind: "admin" | "brand", value: number): void {
  sidebarScrollByKind[kind] = value;
}

export function getPortalWindowScroll(): number {
  return windowScrollY;
}

export function setPortalWindowScroll(value: number): void {
  windowScrollY = value;
}
