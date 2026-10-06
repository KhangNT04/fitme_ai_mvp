import { describe, expect, it } from "vitest";
import {
  campaignIssueBlocker,
  campaignSlotsLeft,
  discountSourceLabel,
  usableVouchers,
  voucherExpiryLabel,
  voucherStatusLabel,
  voucherStatusVariant,
} from "./brand-voucher";
import type { BrandVoucher } from "@/types/billing";

function voucher(overrides: Partial<BrandVoucher>): BrandVoucher {
  return {
    id: overrides.code ?? "v",
    code: "FITME-AAAA-AAAA",
    discountPercent: 50,
    status: "ISSUED",
    usable: true,
    ...overrides,
  };
}

describe("discountSourceLabel", () => {
  it("names the voucher code when a voucher applies", () => {
    expect(discountSourceLabel("VOUCHER", "FITME-7KQ2-M9XD")).toBe("Voucher FITME-7KQ2-M9XD");
    expect(discountSourceLabel("VOUCHER")).toBe("Voucher");
  });

  it("labels the running discount and the no-discount case", () => {
    expect(discountSourceLabel("WINDOW", "FITME-7KQ2-M9XD")).toBe("Giảm theo chương trình");
    expect(discountSourceLabel("NONE")).toBe("Không giảm giá");
  });
});

describe("voucher status helpers", () => {
  it("maps statuses to Vietnamese labels and badge variants", () => {
    expect(voucherStatusLabel("ISSUED")).toBe("Chưa dùng");
    expect(voucherStatusLabel("USED")).toBe("Đã dùng");
    expect(voucherStatusLabel("REVOKED")).toBe("Đã thu hồi");
    expect(voucherStatusVariant("ISSUED")).toBe("success");
    expect(voucherStatusVariant("RESERVED")).toBe("warning");
    expect(voucherStatusVariant("EXPIRED")).toBe("outline");
  });

  it("formats the expiry in Vietnam time or says it never expires", () => {
    expect(voucherExpiryLabel("2026-12-31T16:59:00Z")).toBe("HSD 31/12/2026");
    expect(voucherExpiryLabel(null)).toBe("Không thời hạn");
  });
});

describe("usableVouchers", () => {
  it("keeps usable vouchers, biggest discount first then soonest expiry", () => {
    const list = [
      voucher({ code: "FITME-USED-0000", usable: false, status: "USED", discountPercent: 90 }),
      voucher({ code: "FITME-LATE-0000", discountPercent: 50, expiresAt: "2026-12-31T00:00:00Z" }),
      voucher({ code: "FITME-NONE-0000", discountPercent: 50, expiresAt: null }),
      voucher({ code: "FITME-SOON-0000", discountPercent: 50, expiresAt: "2026-11-01T00:00:00Z" }),
      voucher({ code: "FITME-BIG0-0000", discountPercent: 70 }),
    ];
    expect(usableVouchers(list).map((v) => v.code)).toEqual([
      "FITME-BIG0-0000",
      "FITME-SOON-0000",
      "FITME-LATE-0000",
      "FITME-NONE-0000",
    ]);
  });
});

describe("campaign helpers", () => {
  const base = { active: true, ended: false, validFrom: null, maxBrands: 5, issuedBrandCount: 2 };

  it("counts remaining brand slots", () => {
    expect(campaignSlotsLeft(base)).toBe(3);
    expect(campaignSlotsLeft({ maxBrands: 2, issuedBrandCount: 3 })).toBe(0);
  });

  it("explains why a campaign cannot issue vouchers", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(campaignIssueBlocker(base, now)).toBeNull();
    expect(campaignIssueBlocker({ ...base, active: false }, now)).toBe("Chiến dịch đang tắt.");
    expect(campaignIssueBlocker({ ...base, ended: true }, now)).toBe("Chiến dịch đã hết hạn.");
    expect(campaignIssueBlocker({ ...base, validFrom: "2026-10-10T00:00:00Z" }, now)).toContain("10/10/2026");
    expect(campaignIssueBlocker({ ...base, issuedBrandCount: 5 }, now)).toBe("Chiến dịch đã phát đủ số brand tối đa.");
  });
});
