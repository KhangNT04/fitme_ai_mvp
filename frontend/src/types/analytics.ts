export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  aiRecommendedProducts: number;
  buyClicks: number;
  clickThroughRate: number;
  tryOnAttempts: number;
  tryOnToBuyRate: number;
  tryOnCustomers7d: number;
  tryOnCustomers30d: number;
  topTryOnProducts: ProductCustomers[];
  funnel30d: CustomerFunnel;
}

export interface ProductCustomers {
  productId: string;
  productName: string;
  customers: number;
}

export interface CustomerFunnel {
  tryOnCustomers: number;
  buyClickCustomers: number;
  soldLeads: number;
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
    premiumRevenueVnd: number;
    activePremiumSubscribers: number;
  };
  checkout: {
    premiumCheckoutsStarted: number;
    premiumCheckoutsPaid: number;
    premiumConversionRate: number;
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

/** Ratios are 0..1; null when the denominator is zero (or, for cohort cells, the week has not started yet). */
export interface RetentionMetrics {
  today: string;
  dau: number;
  wau: number;
  mau: number;
  stickiness: number | null;
  retention: Array<{
    day: number;
    cohortFrom: string;
    cohortTo: string;
    retained: number;
    cohortSize: number;
    rate: number | null;
  }>;
  cohorts: Array<{
    weekStart: string;
    size: number;
    /** Index i = calendar week i after the signup week (0 = signup week). */
    activeUsers: Array<number | null>;
    rates: Array<number | null>;
  }>;
  frequency: Array<{ key: string; label: string; minDays: number; maxDays: number | null; users: number }>;
  inactive30d: number;
  totalConsumers: number;
  topUsers: Array<{
    userId: string;
    displayName: string | null;
    email: string;
    lastActiveDate: string;
    activeDays30d: number;
    recommendations30d: number;
    tryOns30d: number;
    buyClicks30d: number;
  }>;
}

export type TrafficTrend = "NO_DATA" | "STRONG_UP" | "UP" | "STABLE" | "DOWN" | "STRONG_DOWN";
export type TrafficLevel = "NO_DATA" | "LOW" | "NORMAL" | "HIGH";
export type TrafficScale = "VERY_LOW" | "LOW" | "MEDIUM" | "GOOD" | "HIGH";
export type TrafficVolatility = "STABLE" | "MODERATE" | "HIGH";

export interface TrafficPeriod {
  visitors: number;
  pageViews: number;
  newVisitors: number;
  /** Same-length window right before (for "day": yesterday up to the same time). */
  previousVisitors: number;
  changePct: number | null;
}

export interface TrafficStats {
  today: string;
  rangeDays: number;
  day: TrafficPeriod;
  week: TrafficPeriod;
  month: TrafficPeriod;
  daily: Array<{ date: string; visitors: number; pageViews: number; newVisitors: number }>;
  weekly: Array<{ start: string; visitors: number; pageViews: number }>;
  monthly: Array<{ start: string; visitors: number; pageViews: number }>;
  /** ISO weekday (1 = Monday … 7 = Sunday). */
  weekdays: Array<{ isoDay: number; avgVisitors: number }>;
  assessment: {
    trend: TrafficTrend;
    trendChangePct: number | null;
    level: TrafficLevel;
    scale: TrafficScale;
    volatility: TrafficVolatility;
    avgDailyVisitors: number;
    recentAvgDailyVisitors: number;
    peakDate: string | null;
    peakVisitors: number;
    busiestWeekday: number | null;
    returningRate: number;
    pagesPerVisit: number;
  };
}

export type PayingTransactionKind = "PREMIUM_SUBSCRIPTION";

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
    mock: boolean;
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
