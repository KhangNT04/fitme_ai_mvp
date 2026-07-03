/** Presentational class constants — style only, no logic */
/** Consumer app max width — shared by PageShell, Header, Footer, landing sections. */
export const consumerShellMaxWidthClass = "max-w-7xl";
export const consumerShellHorizontalClass = "mx-auto w-full px-4 sm:px-6";
/** Vertical padding for catalog / wizard / profile pages (pair with `pageContainer`). */
export const consumerPageShellClass = "py-3 sm:py-5";
export const pageContainer = `${consumerShellHorizontalClass} ${consumerShellMaxWidthClass}`;
/** Brand/admin portal — 1.5× consumer full width (7xl → 120rem). */
export const portalShellMaxWidthClass = "max-w-[120rem]";
export const pageContainerPortal = `mx-auto flex min-h-[calc(100dvh-4rem)] w-full flex-col ${portalShellMaxWidthClass} px-4 py-3 sm:px-6 sm:py-4 lg:py-5`;
export const pageContainerNarrow = "mx-auto max-w-xl px-4 py-8 sm:px-6";
export const pageContainerMedium = "mx-auto max-w-2xl px-4 py-8 sm:px-6";
export const pageContainerWide = "mx-auto max-w-4xl px-4 py-8 sm:px-6";
/** Guest / empty prompt card — full content width inside PageShell (no max-w-md). */
export const consumerGuestPromptClass =
  "surface-card w-full rounded-xl px-5 py-8 text-center sm:rounded-2xl sm:px-6 sm:py-10";
/** Product detail — media column width on desktop. */
export const productDetailMediaColumnClass =
  "mx-auto w-full lg:mx-0 lg:w-[32rem] lg:max-w-[32rem] lg:shrink-0";
export const productDetailGridClass = "grid gap-8 lg:grid-cols-[32rem_minmax(0,1fr)] lg:gap-12";
/** Card shell for product detail — extra vertical breathing room. */
export const productDetailShellClass =
  "surface-card rounded-2xl p-5 sm:p-6 lg:p-8 lg:py-10";
export const productDetailInfoColumnClass =
  "flex min-h-full flex-col justify-between gap-8 lg:min-h-[34rem]";
export const productDetailSummaryClass = "space-y-5 lg:space-y-6";
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

/** Brand / admin portal shell */
export const portalLayoutRowClass = "flex min-h-0 flex-1 gap-6 sm:gap-8";
export const portalContentClass = "min-w-0 flex-1 space-y-6";
export const portalTableShellClass = "";
export const portalTableWrapClass = "mt-5 sm:mt-6";
export const portalTableScrollClass =
  "max-h-[calc(100dvh-14rem)] overflow-auto overscroll-contain rounded-2xl border border-border/60 bg-card shadow-sm [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5";
export const portalTableClass = "portal-data-table";
/** Kept for thead grouping; sticky + opaque bg live on th via .portal-data-table CSS. */
export const portalTableHeadClass = "";
export const portalTableThClass =
  "px-4 py-3 text-left text-xs font-semibold tracking-wide text-primary/80";
export const portalTableTdClass = "px-4 py-3 align-middle";
export const portalTableBodyClass =
  "[&_tr:nth-child(odd)]:bg-card [&_tr:nth-child(even)]:bg-primary/[0.04] [&_tr:hover]:bg-primary/[0.07] [&_tr]:transition-colors [&_tr_td]:border-b [&_tr_td]:border-primary/[0.06] [&_tr:last-child_td]:border-b-0";
export const portalCardListClass = "space-y-3 md:hidden";
/** Card stack visible on all breakpoints (catalogs, billing plans, rules). */
export const portalCardStackClass = "space-y-3";
export const portalCardClass =
  "rounded-2xl border border-border/60 bg-card p-4 shadow-sm";
export const portalFormCardClass =
  "rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-4 sm:p-5";
export const portalWarningCardClass =
  "rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm space-y-4 sm:p-5";
export const portalSectionClass = "space-y-6";
export const portalSectionTitleClass = "text-lg font-semibold text-foreground";
export const portalCardRowClass = "flex items-start justify-between gap-3";
export const portalCardActionsClass = "mt-3 flex flex-wrap gap-2";
export const portalTableActionsClass = "flex flex-wrap items-center gap-2";
