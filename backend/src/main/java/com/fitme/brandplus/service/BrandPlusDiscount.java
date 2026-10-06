package com.fitme.brandplus.service;

import com.fitme.common.enums.PlanDiscountSource;

/**
 * Discounts never stack: the larger of the plan's running (time-window) discount and the voucher wins.
 * On a tie the window discount applies, so the voucher is kept for a later purchase.
 */
public record BrandPlusDiscount(int windowPercent, Integer voucherPercent, int appliedPercent,
                                PlanDiscountSource source) {

    public static BrandPlusDiscount decide(int windowPercent, Integer voucherPercent) {
        int window = Math.max(windowPercent, 0);
        if (voucherPercent != null && voucherPercent > window) {
            return new BrandPlusDiscount(window, voucherPercent, voucherPercent, PlanDiscountSource.VOUCHER);
        }
        return new BrandPlusDiscount(window, voucherPercent, window,
                window > 0 ? PlanDiscountSource.WINDOW : PlanDiscountSource.NONE);
    }

    public boolean voucherApplied() {
        return source == PlanDiscountSource.VOUCHER;
    }

    /** Why a selected voucher was not used, or null when none was selected or it was applied. */
    public String voucherIgnoredReason() {
        if (voucherPercent == null || voucherApplied()) {
            return null;
        }
        String comparison = windowPercent > voucherPercent ? "nhiều hơn voucher (" + voucherPercent + "%)" : "bằng mức voucher";
        return "Chương trình đang giảm " + windowPercent + "%, " + comparison
                + ", nên FitMe áp dụng mức giảm của chương trình và giữ lại voucher cho lần sau.";
    }
}
