import type { BrandBillingSummary } from "@/types/billing";

export interface BrandDashboardBlockReason {
  title: string;
  message: string;
}

function formatViDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function getBrandDashboardBlockReason(
  summary: BrandBillingSummary,
): BrandDashboardBlockReason | null {
  if (summary.dashboardEnabled) {
    return null;
  }

  const sub = summary.subscription;

  if (!sub) {
    if (summary.totalRemaining > 0) {
      return {
        title: "Gói top-up không bao gồm dashboard",
        message:
          "Bạn đang dùng gói tăng cường (top-up), chỉ cung cấp lượt thử AI 2D. Trang Tổng quan và Phân tích yêu cầu gói tháng Starter, Growth hoặc Pro đang hoạt động.",
      };
    }
    return {
      title: "Chưa có gói tháng",
      message:
        "Bạn chưa đăng ký gói tháng. Trang Tổng quan và Phân tích chỉ dành cho gói Starter, Growth hoặc Pro đang hoạt động.",
    };
  }

  if (sub.status === "EXPIRED") {
    return {
      title: "Gói tháng đã hết hạn",
      message: `Gói ${sub.planName} đã hết hạn vào ${formatViDate(sub.expiresAt)}. Gia hạn hoặc mua gói mới để tiếp tục xem dashboard phân tích.`,
    };
  }

  if (sub.status === "CANCELLED") {
    return {
      title: "Gói tháng đã bị hủy",
      message: `Gói ${sub.planName} không còn hoạt động. Đăng ký lại gói Starter, Growth hoặc Pro để mở dashboard.`,
    };
  }

  if (new Date(sub.expiresAt) <= new Date()) {
    return {
      title: "Gói tháng đã hết hạn",
      message: `Gói ${sub.planName} hết hạn vào ${formatViDate(sub.expiresAt)}. Gia hạn hoặc mua gói mới để tiếp tục xem dashboard phân tích.`,
    };
  }

  return {
    title: "Gói hiện tại không bao gồm dashboard",
    message:
      "Gói đang dùng không có quyền xem Tổng quan và Phân tích. Vui lòng đăng ký gói Starter, Growth hoặc Pro.",
  };
}
