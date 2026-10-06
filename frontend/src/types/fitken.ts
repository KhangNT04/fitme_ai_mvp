export interface SubscriptionInfoDto {
  planId: string;
  planName: string;
  status: string;
  startsAt: string;
  expiresAt: string;
}

export interface FitkenWalletResponse {
  balance: number;
  subscriptionRemaining: number;
  bonusRemaining: number;
  trialGranted: boolean;
  tryOnCost: number;
  plan: "FREE" | "PREMIUM";
  /** Free Fitken (trial / rewards) stops once the balance reaches this cap. */
  maxBalance: number;
  subscription?: SubscriptionInfoDto;
}

export interface FitkenLedgerItemDto {
  id: string;
  entryType: string;
  delta: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}
