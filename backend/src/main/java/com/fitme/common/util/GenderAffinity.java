package com.fitme.common.util;

import com.fitme.common.enums.Gender;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.userprofile.entity.BodyProfile;

/** AI ranking bonus from user gender vs product design audience. Hard exclusions use {@link com.fitme.product.service.ProductAudienceService#isRecommendableFor}. */
public final class GenderAffinity {

    public static final double MATCH_BONUS = 15;
    public static final double UNISEX_BONUS = 5;

    private GenderAffinity() {
    }

    public static double scoreBonus(BodyProfile body, ProductTargetGender target) {
        if (body == null || body.getGender() == null || target == null) {
            return 0;
        }
        if (target == ProductTargetGender.UNISEX) {
            return UNISEX_BONUS;
        }
        Gender user = body.getGender();
        if (user == Gender.OTHER) {
            return 0;
        }
        if (user == Gender.FEMALE && target == ProductTargetGender.FEMALE) {
            return MATCH_BONUS;
        }
        if (user == Gender.MALE && target == ProductTargetGender.MALE) {
            return MATCH_BONUS;
        }
        return 0;
    }
}
