package com.fitme.product.service;

import com.fitme.common.enums.Gender;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.userprofile.entity.BodyProfile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductAudienceServiceTest {

    @Mock
    private ProductTagRepository tagRepository;

    @InjectMocks
    private ProductAudienceService productAudienceService;

    @Test
    void genderAffinityBonus_boostsMatchingGenderWithoutBlockingOthers() {
        UUID id = UUID.randomUUID();
        Product product = Product.builder().id(id).build();
        when(tagRepository.findByProductId(id)).thenReturn(List.of(
                ProductTag.builder().tagType("TARGET_GENDER").tagValue("FEMALE").build()
        ));

        BodyProfile female = BodyProfile.builder().gender(Gender.FEMALE).build();
        BodyProfile male = BodyProfile.builder().gender(Gender.MALE).build();

        assertThat(productAudienceService.genderAffinityBonus(product, female))
                .isEqualTo(GenderAffinity.MATCH_BONUS);
        assertThat(productAudienceService.genderAffinityBonus(product, male)).isZero();
    }

    @Test
    void genderAffinityBonus_givesModestBoostForUnisex() {
        UUID id = UUID.randomUUID();
        Product product = Product.builder().id(id).build();
        when(tagRepository.findByProductId(id)).thenReturn(List.of(
                ProductTag.builder().tagType("TARGET_GENDER").tagValue("UNISEX").build()
        ));

        BodyProfile male = BodyProfile.builder().gender(Gender.MALE).build();
        assertThat(productAudienceService.genderAffinityBonus(product, male))
                .isEqualTo(GenderAffinity.UNISEX_BONUS);
    }

    @Test
    void resolveTargetGender_infersFemaleFromDressCategoryWhenTagMissing() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findByProductId(id)).thenReturn(List.of());

        Product dress = Product.builder().id(id).category("Váy").name("Chân váy chữ A midi").build();
        assertThat(productAudienceService.resolveTargetGender(dress)).isEqualTo(ProductTargetGender.FEMALE);
    }

    @Test
    void isRecommendableFor_blocksDressForMaleUser() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findByProductId(id)).thenReturn(List.of());

        Product dress = Product.builder().id(id).category("Váy").name("Chân váy chữ A midi").build();
        BodyProfile male = BodyProfile.builder().gender(Gender.MALE).build();

        assertThat(productAudienceService.isRecommendableFor(male, dress)).isFalse();
    }

    @Test
    void isRecommendableFor_allowsUnisexPantsForMaleUser() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findByProductId(id)).thenReturn(List.of());

        Product pants = Product.builder().id(id).category("Quần").name("Quần jean slim").build();
        BodyProfile male = BodyProfile.builder().gender(Gender.MALE).build();

        assertThat(productAudienceService.isRecommendableFor(male, pants)).isTrue();
    }

    @Test
    void resolveTargetGender_defaultsToUnisexWhenTagMissing() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findByProductId(id)).thenReturn(List.of());

        assertThat(productAudienceService.resolveTargetGender(id)).isEqualTo(ProductTargetGender.UNISEX);
    }
}
