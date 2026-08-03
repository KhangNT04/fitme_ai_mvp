package com.fitme.brand.service;

import com.fitme.brand.entity.BrandPartnership;
import com.fitme.brand.repository.BrandPartnershipRepository;
import com.fitme.common.enums.BrandPartnershipStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.brand.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrandPartnershipService {

    private final BrandPartnershipRepository partnershipRepository;
    private final BrandRepository brandRepository;

    public Set<UUID> findPartnerBrandIds(UUID brandId) {
        if (brandId == null) {
            return Set.of();
        }
        List<BrandPartnership> rows = partnershipRepository.findActiveForBrand(
                brandId, BrandPartnershipStatus.ACTIVE);
        Set<UUID> partners = new HashSet<>();
        for (BrandPartnership row : rows) {
            if (brandId.equals(row.getBrandAId())) {
                partners.add(row.getBrandBId());
            } else {
                partners.add(row.getBrandAId());
            }
        }
        return partners;
    }

    public boolean arePartners(UUID brandA, UUID brandB) {
        if (brandA == null || brandB == null || brandA.equals(brandB)) {
            return false;
        }
        return findPartnerBrandIds(brandA).contains(brandB);
    }

    @Transactional
    public BrandPartnership upsertPartnership(UUID brandOne, UUID brandTwo) {
        if (brandOne == null || brandTwo == null || brandOne.equals(brandTwo)) {
            throw new BusinessException("Hai brand partner phải khác nhau");
        }
        if (brandRepository.findById(brandOne).isEmpty() || brandRepository.findById(brandTwo).isEmpty()) {
            throw new NotFoundException("Brand không tồn tại");
        }
        UUID a = brandOne.compareTo(brandTwo) < 0 ? brandOne : brandTwo;
        UUID b = brandOne.compareTo(brandTwo) < 0 ? brandTwo : brandOne;
        return partnershipRepository.findByBrandAIdAndBrandBId(a, b)
                .map(existing -> {
                    existing.setStatus(BrandPartnershipStatus.ACTIVE);
                    return partnershipRepository.save(existing);
                })
                .orElseGet(() -> partnershipRepository.save(BrandPartnership.builder()
                        .brandAId(a)
                        .brandBId(b)
                        .status(BrandPartnershipStatus.ACTIVE)
                        .build()));
    }

    public List<BrandPartnership> listActive() {
        return partnershipRepository.findByStatus(BrandPartnershipStatus.ACTIVE);
    }
}
