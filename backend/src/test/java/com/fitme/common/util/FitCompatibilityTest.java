package com.fitme.common.util;

import com.fitme.common.enums.FitPreference;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FitCompatibilityTest {

    @Test
    void oversizePreference_scoresRelaxedAndOversizeProducts() {
        assertThat(FitCompatibility.scoreBonus(FitPreference.OVERSIZE, FitPreference.OVERSIZE)).isEqualTo(15);
        assertThat(FitCompatibility.scoreBonus(FitPreference.RELAXED, FitPreference.OVERSIZE)).isEqualTo(12);
        assertThat(FitCompatibility.scoreBonus(FitPreference.SLIM, FitPreference.OVERSIZE)).isZero();
    }
}
