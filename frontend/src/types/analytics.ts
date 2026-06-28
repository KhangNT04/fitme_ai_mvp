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
  activeUsers: number;
  totalRecommendations: number;
  totalTryOns: number;
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
