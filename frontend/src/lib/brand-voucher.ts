import { formatDateDMY, parseApiDate } from "@/lib/date-format";
import type { BrandVoucher, BrandVoucherStatus, PlanDiscountSource, VoucherCampaign } from "@/types/billing";

export const VOUCHER_STATUS_LABEL: Record<BrandVoucherStatus, string> = {
  ISSUED: "Chưa dùng",
  RESERVED: "Đang giữ cho đơn chờ thanh toán",
  USED: "Đã dùng",
  REVOKED: "Đã thu hồi",
  EXPIRED: "Hết hạn",
};

export function voucherStatusLabel(status: BrandVoucherStatus): string {
  return VOUCHER_STATUS_LABEL[status] ?? status;
}

export function voucherStatusVariant(status: BrandVoucherStatus): "success" | "warning" | "secondary" | "outline" {
  switch (status) {
    case "ISSUED":
      return "success";
    case "RESERVED":
      return "warning";
    case "USED":
      return "secondary";
    default:
      return "outline";
  }
}

/** "Voucher FITME-XXXX-XXXX", "Giảm theo chương trình" or "Không giảm giá". */
export function discountSourceLabel(source: PlanDiscountSource, voucherCode?: string | null): string {
  if (source === "VOUCHER") return voucherCode ? `Voucher ${voucherCode}` : "Voucher";
  if (source === "WINDOW") return "Giảm theo chương trình";
  return "Không giảm giá";
}

/** "HSD 31/12/2026" or "Không thời hạn". */
export function voucherExpiryLabel(expiresAt?: string | null): string {
  return parseApiDate(expiresAt) ? `HSD ${formatDateDMY(expiresAt)}` : "Không thời hạn";
}

/** Vouchers that can be picked at checkout: biggest discount first, then the one expiring soonest. */
export function usableVouchers(vouchers: BrandVoucher[]): BrandVoucher[] {
  const expiry = (v: BrandVoucher) => parseApiDate(v.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  return vouchers
    .filter((v) => v.usable)
    .sort((a, b) => b.discountPercent - a.discountPercent || expiry(a) - expiry(b) || a.code.localeCompare(b.code));
}

export function campaignSlotsLeft(campaign: Pick<VoucherCampaign, "maxBrands" | "issuedBrandCount">): number {
  return Math.max(0, campaign.maxBrands - campaign.issuedBrandCount);
}

/** Why vouchers cannot be issued right now, or null when the campaign accepts new brands. */
export function campaignIssueBlocker(
  campaign: Pick<VoucherCampaign, "active" | "ended" | "validFrom" | "maxBrands" | "issuedBrandCount">,
  now: Date = new Date(),
): string | null {
  if (!campaign.active) return "Chiến dịch đang tắt.";
  if (campaign.ended) return "Chiến dịch đã hết hạn.";
  const from = parseApiDate(campaign.validFrom);
  if (from && now.getTime() < from.getTime()) return `Chiến dịch bắt đầu phát từ ${formatDateDMY(campaign.validFrom)}.`;
  if (campaignSlotsLeft(campaign) === 0) return "Chiến dịch đã phát đủ số brand tối đa.";
  return null;
}
