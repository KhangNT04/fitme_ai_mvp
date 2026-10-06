package com.fitme.admin.service;

import com.fitme.admin.dto.AdminBrandListItemDto;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brandplus.entity.BrandSubscription;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminBrandListService {

    private final BrandRepository brandRepository;
    private final BrandPlusService brandPlusService;
    private final AppClock clock;

    public List<AdminBrandListItemDto> listBrands() {
        Map<UUID, BrandSubscription> subscriptions = brandPlusService.subscriptionsByBrand();
        Instant now = clock.now();
        return brandRepository.findAll().stream()
                .map(brand -> toAdminItem(brand, subscriptions.get(brand.getId()), now))
                .toList();
    }

    private AdminBrandListItemDto toAdminItem(Brand brand, BrandSubscription subscription, Instant now) {
        return AdminBrandListItemDto.builder()
                .id(brand.getId())
                .name(brand.getName())
                .contactEmail(brand.getContactEmail())
                .status(brand.getStatus().name())
                .createdAt(brand.getCreatedAt())
                .dashboardEnabled(brand.getStatus() == BrandStatus.APPROVED)
                .plusActive(subscription != null && subscription.isActiveAt(now))
                .plusEndsAt(subscription != null ? subscription.getEndsAt() : null)
                .build();
    }
}
