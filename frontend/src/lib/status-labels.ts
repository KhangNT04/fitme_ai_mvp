import type { ProductStatus } from "@/types/product";

/** Human-readable product workflow labels for brand/admin UI. */
export function productStatusLabel(status?: ProductStatus | string | null): string {
  switch (status) {
    case "DRAFT":
      return "Bản nháp";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "ACTIVE":
      return "Đang hiển thị";
    case "REJECTED":
      return "Bị từ chối";
    case "INACTIVE":
      return "Tạm ẩn";
    case "FLAGGED":
      return "Cần xử lý";
    default:
      return status ? String(status) : "—";
  }
}

/** Brand account approval status (not product). */
export function brandStatusLabel(status?: string | null): string {
  switch (status) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Từ chối";
    case "SUSPENDED":
      return "Tạm ngưng";
    default:
      return status ? String(status) : "—";
  }
}

export function flaggedLinkReasonLabel(reason?: string | null): string {
  switch (reason) {
    case "BROKEN_URL":
      return "Link không hợp lệ";
    case "MISSING_URL":
      return "Thiếu link mua";
    case "UNSAFE_URL":
      return "Link không an toàn";
    case "REDIRECT_ERROR":
      return "Lỗi chuyển hướng";
    default:
      return reason ? String(reason) : "—";
  }
}

export function flaggedLinkStatusLabel(status?: string | null): string {
  switch (status) {
    case "OPEN":
      return "Chờ xử lý";
    case "PENDING":
      return "Đang xử lý";
    case "RESOLVED":
      return "Đã xử lý";
    case "REJECTED":
      return "Đã từ chối";
    default:
      return status ? String(status) : "—";
  }
}
