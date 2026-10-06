package com.fitme.brandplus.service;

import com.fitme.common.enums.PlanDiscountSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BrandPlusDiscountTest {

    @Test
    void noDiscountAtAll() {
        BrandPlusDiscount discount = BrandPlusDiscount.decide(0, null);
        assertThat(discount.appliedPercent()).isZero();
        assertThat(discount.source()).isEqualTo(PlanDiscountSource.NONE);
        assertThat(discount.voucherApplied()).isFalse();
        assertThat(discount.voucherIgnoredReason()).isNull();
    }

    @Test
    void windowOnly() {
        BrandPlusDiscount discount = BrandPlusDiscount.decide(20, null);
        assertThat(discount.appliedPercent()).isEqualTo(20);
        assertThat(discount.source()).isEqualTo(PlanDiscountSource.WINDOW);
        assertThat(discount.voucherIgnoredReason()).isNull();
    }

    @Test
    void largerVoucherWins() {
        BrandPlusDiscount discount = BrandPlusDiscount.decide(20, 50);
        assertThat(discount.appliedPercent()).isEqualTo(50);
        assertThat(discount.source()).isEqualTo(PlanDiscountSource.VOUCHER);
        assertThat(discount.voucherApplied()).isTrue();
        assertThat(discount.voucherIgnoredReason()).isNull();
    }

    @Test
    void largerWindowKeepsTheVoucher() {
        BrandPlusDiscount discount = BrandPlusDiscount.decide(60, 50);
        assertThat(discount.appliedPercent()).isEqualTo(60);
        assertThat(discount.source()).isEqualTo(PlanDiscountSource.WINDOW);
        assertThat(discount.voucherApplied()).isFalse();
        assertThat(discount.voucherIgnoredReason()).contains("60%").contains("50%").contains("giữ lại voucher");
    }

    @Test
    void tieGoesToTheWindowSoTheVoucherIsKept() {
        BrandPlusDiscount discount = BrandPlusDiscount.decide(50, 50);
        assertThat(discount.source()).isEqualTo(PlanDiscountSource.WINDOW);
        assertThat(discount.voucherIgnoredReason()).contains("bằng mức voucher");
    }
}
