package com.fitme.brand.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.entity.BrandPartnership;
import com.fitme.brand.repository.BrandPartnershipRepository;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandPartnershipStatus;
import com.fitme.common.enums.BrandStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BrandPartnershipServiceTest {

    @Mock
    private BrandPartnershipRepository partnershipRepository;
    @Mock
    private BrandRepository brandRepository;
    @InjectMocks
    private BrandPartnershipService service;

    @Test
    void upsertOrdersByUuidTextMatchingPostgresTextCheck() {
        // Regression: Java UUID.compareTo is signed; Postgres UUID < disagreed and killed seed.
        UUID highSignedLowText = UUID.fromString("df8d4957-c9d5-47d4-b9d3-db0fca1dfb56");
        UUID lowSignedHighText = UUID.fromString("79729557-adf3-4f1a-b58d-f27904ae565c");
        assertThat(highSignedLowText.compareTo(lowSignedHighText)).isNegative();
        assertThat(highSignedLowText.toString().compareTo(lowSignedHighText.toString())).isPositive();

        when(brandRepository.findById(highSignedLowText)).thenReturn(Optional.of(Brand.builder()
                .id(highSignedLowText).name("A").status(BrandStatus.APPROVED).build()));
        when(brandRepository.findById(lowSignedHighText)).thenReturn(Optional.of(Brand.builder()
                .id(lowSignedHighText).name("B").status(BrandStatus.APPROVED).build()));
        when(partnershipRepository.findByBrandAIdAndBrandBId(any(), any())).thenReturn(Optional.empty());
        when(partnershipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.upsertPartnership(highSignedLowText, lowSignedHighText);

        ArgumentCaptor<BrandPartnership> captor = ArgumentCaptor.forClass(BrandPartnership.class);
        verify(partnershipRepository).save(captor.capture());
        BrandPartnership saved = captor.getValue();
        assertThat(saved.getBrandAId()).isEqualTo(lowSignedHighText);
        assertThat(saved.getBrandBId()).isEqualTo(highSignedLowText);
        assertThat(saved.getBrandAId().toString().compareTo(saved.getBrandBId().toString())).isNegative();
        assertThat(saved.getStatus()).isEqualTo(BrandPartnershipStatus.ACTIVE);
    }
}
