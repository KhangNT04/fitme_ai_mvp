import type { FitkenWalletResponse } from "@/types/fitken";
import type { TryOnQuote } from "@/types/tryon";

type WalletCost = Pick<FitkenWalletResponse, "balance" | "tryOnCost">;

/** Cost line on the generate button; the quote wins over the wallet's flat try-on cost once loaded. */
export function tryOnCostLabel(quote: TryOnQuote | null | undefined, wallet: WalletCost | null | undefined): string | null {
  if (quote?.free) {
    return `Miễn phí (còn ${quote.freeRemainingToday} lượt hôm nay)`;
  }
  const cost = quote?.fitkenCost ?? wallet?.tryOnCost;
  if (cost == null) return null;
  const charged = `Tốn ${cost} Fitken`;
  return quote?.allPlus && quote.freeDailyLimit > 0 ? `Hết lượt miễn phí hôm nay · ${charged}` : charged;
}

/** A free Brand Plus try-on needs no Fitken, so a 0-balance user can still go ahead. */
export function needsFitkenTopUp(quote: TryOnQuote | null | undefined, wallet: WalletCost | null | undefined): boolean {
  if (!wallet || quote?.free) return false;
  return wallet.balance < (quote?.fitkenCost ?? wallet.tryOnCost);
}
