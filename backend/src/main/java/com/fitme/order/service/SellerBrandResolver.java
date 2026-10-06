package com.fitme.order.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brand.service.BrandService;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Resolves the brand (seller) owned by the signed-in brand account for /api/v1/brand commerce endpoints.
 * Only approved brands may act; a suspended brand's orders are handled by admins.
 */
@Component
@RequiredArgsConstructor
public class SellerBrandResolver {

    private final BrandRepository brandRepository;

    public UUID currentBrandId() {
        Brand brand = brandRepository.findByOwnerUserId(RequestContext.requireUserId()).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("Tài khoản chưa sở hữu thương hiệu"));
        BrandService.requireApproved(brand);
        return brand.getId();
    }
}
