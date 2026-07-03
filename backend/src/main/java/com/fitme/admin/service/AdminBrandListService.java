package com.fitme.admin.service;

import com.fitme.admin.dto.AdminBrandListItemDto;
import com.fitme.billing.service.BrandBillingService;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBrandListService {

    private final BrandRepository brandRepository;
    private final BrandBillingService brandBillingService;

    public List<AdminBrandListItemDto> listBrandsWithBilling() {
        return brandRepository.findAll().stream().map(this::toAdminItem).toList();
    }

    private AdminBrandListItemDto toAdminItem(Brand brand) {
        var summary = brandBillingService.getSummary(brand.getId());
        return AdminBrandListItemDto.builder()
                .id(brand.getId())
                .name(brand.getName())
                .contactEmail(brand.getContactEmail())
                .status(brand.getStatus().name())
                .createdAt(brand.getCreatedAt())
                .totalQuotaRemaining(summary.getTotalRemaining())
                .activePlanName(summary.getSubscription() != null ? summary.getSubscription().getPlanName() : null)
                .dashboardEnabled(summary.isDashboardEnabled())
                .build();
    }
}
