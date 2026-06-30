export function discoverBrandPath(brandId: string): string {
  return `/discover/brand/${brandId}`;
}

export function tryOnBrandPath(brandId: string): string {
  return `/try-on/brand/${brandId}`;
}
