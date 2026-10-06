import { SOURCE_PAGES, type BuyClickRequest, type SourcePage } from "@/types/redirect";

const SOURCE_PARAM = "source";
const RECOMMENDATION_PARAM = "recommendation";
const TRY_ON_PARAM = "tryOn";
const SIZE_PARAM = "size";
const COLOR_PARAM = "color";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RedirectConfirmContext {
  sourcePage: SourcePage;
  /** Must reference an existing recommendation — the backend stores it behind a foreign key. */
  recommendationId?: string | null;
  /** Must reference an existing try-on request — the backend stores it behind a foreign key. */
  tryOnRequestId?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

export function isSourcePage(value: unknown): value is SourcePage {
  return typeof value === "string" && (SOURCE_PAGES as readonly string[]).includes(value);
}

export function redirectConfirmHref(productId: string, context: RedirectConfirmContext): string {
  const params = new URLSearchParams({ [SOURCE_PARAM]: context.sourcePage });
  if (context.recommendationId) params.set(RECOMMENDATION_PARAM, context.recommendationId);
  if (context.tryOnRequestId) params.set(TRY_ON_PARAM, context.tryOnRequestId);
  if (context.selectedSize) params.set(SIZE_PARAM, context.selectedSize);
  if (context.selectedColor) params.set(COLOR_PARAM, context.selectedColor);
  return `/redirect/confirm/${productId}?${params.toString()}`;
}

type SearchLike = { get(name: string): string | null } | null | undefined;

function uuidParam(search: SearchLike, name: string): string | undefined {
  const value = search?.get(name)?.trim();
  return value && UUID_RE.test(value) ? value : undefined;
}

function textParam(search: SearchLike, name: string, maxLength: number): string | undefined {
  const value = search?.get(name)?.trim();
  return value ? value.slice(0, maxLength) : undefined;
}

/** Reads the buy-click attribution passed via redirectConfirmHref; unknown sources fall back to PRODUCT_DETAIL. */
export function buyClickContextFromSearch(search: SearchLike): Omit<BuyClickRequest, "productId"> {
  const source = search?.get(SOURCE_PARAM);
  const context: Omit<BuyClickRequest, "productId"> = {
    sourcePage: isSourcePage(source) ? source : "PRODUCT_DETAIL",
  };
  const recommendationId = uuidParam(search, RECOMMENDATION_PARAM);
  const tryOnRequestId = uuidParam(search, TRY_ON_PARAM);
  const selectedSize = textParam(search, SIZE_PARAM, 50);
  const selectedColor = textParam(search, COLOR_PARAM, 100);
  if (recommendationId) context.recommendationId = recommendationId;
  if (tryOnRequestId) context.tryOnRequestId = tryOnRequestId;
  if (selectedSize) context.selectedSize = selectedSize;
  if (selectedColor) context.selectedColor = selectedColor;
  return context;
}
