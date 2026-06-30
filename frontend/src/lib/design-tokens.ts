/** Presentational class constants — style only, no logic */
export const pageContainer = "mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6";
export const pageContainerNarrow = "mx-auto max-w-xl px-4 py-8 sm:px-6";
export const pageContainerMedium = "mx-auto max-w-2xl px-4 py-8 sm:px-6";
export const pageContainerWide = "mx-auto max-w-4xl px-4 py-8 sm:px-6";
export const pageTitle = "font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl";
export const pageSubtitle = "mt-2 text-base leading-relaxed text-muted-foreground";
export const sectionTitle = "font-display text-xl font-semibold text-foreground";
/** Shared product grid — 2 cols mobile, 4 cols from md (discover expanded brand, try-on, …) */
export const catalogProductGridClass =
  "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4";
/** Horizontal product row — one brand per row on discover */
export const catalogProductRowClass =
  "flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory sm:gap-3 [scrollbar-width:thin]";
export const catalogProductRowItemClass =
  "w-[10.75rem] shrink-0 snap-start sm:w-48 md:w-[14.25rem] lg:w-[15rem]";
/** Vertical padding aligned with discover / try-on catalog pages */
export const consumerPageShellClass = "py-3 sm:py-5";
