package com.fitme.admin.service;

import com.fitme.admin.dto.AdminBrandListItemDto;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBrandListService {

    private final BrandRepository brandRepository;

    public List<AdminBrandListItemDto> listBrands() {
        return brandRepository.findAll().stream().map(this::toAdminItem).toList();
    }

    private AdminBrandListItemDto toAdminItem(Brand brand) {
        return AdminBrandListItemDto.builder()
                .id(brand.getId())
                .name(brand.getName())
                .contactEmail(brand.getContactEmail())
                .status(brand.getStatus().name())
                .createdAt(brand.getCreatedAt())
                .dashboardEnabled(brand.getStatus() == BrandStatus.APPROVED)
                .build();
    }
}
