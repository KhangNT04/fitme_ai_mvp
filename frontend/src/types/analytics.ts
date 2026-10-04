export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  aiRecommendedProducts: number;
  buyClicks: number;
  clickThroughRate: number;
  tryOnAttempts: number;
  tryOnToBuyRate: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface BrandAnalytics {
  redirectClicks: ChartDataPoint[];
  dropoffPoints: ChartDataPoint[];
  hesitationItems: ChartDataPoint[];
  tryOnStats: ChartDataPoint[];
  topOccasions: ChartDataPoint[];
  topStyles: ChartDataPoint[];
  topColors: ChartDataPoint[];
  topSizes: ChartDataPoint[];
}

export interface AdminDashboardStats {
  totalBrands: number;
  pendingBrands: number;
  totalProducts: number;
  pendingProducts: number;
  flaggedLinks: number;
  /** Consumer accounts (role USER). */
  totalUsers: number;
  /** Consumers active in the last 30 days. */
  activeUsers: number;
  totalRecommendations: number;
  totalTryOns: number;
}

export interface AdminMetrics {
  rangeDays: number;
  fromDate: string;
  toDate: string;
  users: {
    totalUsers: number;
    verifiedUsers: number;
    newUsers: number;
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    returningUsers30d: number;
  };
  revenue: {
    payingUsersAllTime: number;
    payingUsersInRange: number;
    paidTransactionsInRange: number;
    proRevenueVnd: number;
    orderRevenueVnd: number;
    activeProSubscribers: number;
  };
  checkout: {
    orderCheckoutsStarted: number;
    orderCheckoutsPaid: number;
    orderCheckoutsAbandoned: number;
    orderAbandonmentRate: number;
    proCheckoutsStarted: number;
    proCheckoutsPaid: number;
    proConversionRate: number;
  };
  funnel: Array<{ key: string; label: string; users: number }>;
  daily: Array<{
    date: string;
    signups: number;
    activeUsers: number;
    tryOns: number;
    paidTransactions: number;
    revenueVnd: number;
  }>;
  signupSources: Array<{ source: string; users: number; payingUsers: number }>;
}

export type PayingTransactionKind = "PRO_SUBSCRIPTION" | "ORDER_PAYOS" | "ORDER_COD";

export interface PayingCustomersReport {
  payingCustomers: number;
  transactions: number;
  totalRevenueVnd: number;
  mockTransactions: number;
  liveRevenueVnd: number;
  payosMock: boolean;
  rows: Array<{
    kind: PayingTransactionKind;
    transactionId: string;
    reference: string | null;
    payosOrderCode: number | null;
    amountVnd: number;
    paidAt: string;
    userId: string;
    customerName: string | null;
    email: string | null;
    phone: string | null;
    mock: boolean | null;
  }>;
}

export interface FlaggedLink {
  id: string;
  productId: string;
  productName: string;
  url: string;
  reason: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "REJECTED";
  createdAt?: string;
}

export interface StyleRule {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  keywords?: string[];
  active: boolean;
}

export interface OccasionRule {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  keywords?: string[];
  active: boolean;
}
