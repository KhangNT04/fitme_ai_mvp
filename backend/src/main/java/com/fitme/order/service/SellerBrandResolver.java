package com.fitme.order.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Resolves the brand (seller) owned by the signed-in brand account for /api/v1/brand commerce endpoints. */
@Component
@RequiredArgsConstructor
public class SellerBrandResolver {

    private final BrandRepository brandRepository;

    public UUID currentBrandId() {
        return brandRepository.findByOwnerUserId(RequestContext.requireUserId()).stream()
                .findFirst()
                .map(Brand::getId)
                .orElseThrow(() -> new BusinessException("Tài khoản chưa sở hữu thương hiệu"));
    }
}
