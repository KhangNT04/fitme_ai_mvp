package com.fitme.settlement.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.exception.NotFoundException;
import com.fitme.settlement.dto.PayoutAccountDto;
import com.fitme.settlement.dto.PayoutAccountRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Bank account a brand is paid out to (stored on {@link Brand}). */
@Service
@RequiredArgsConstructor
public class PayoutAccountService {

    private final BrandRepository brandRepository;

    public PayoutAccountDto get(UUID brandId) {
        return PayoutAccountDto.from(requireBrand(brandId));
    }

    @Transactional
    public PayoutAccountDto update(UUID brandId, PayoutAccountRequest request) {
        Brand brand = requireBrand(brandId);
        brand.setBankName(request.getBankName());
        brand.setBankAccountNumber(request.getBankAccountNumber());
        brand.setBankAccountName(request.getBankAccountName());
        return PayoutAccountDto.from(brandRepository.save(brand));
    }

    private Brand requireBrand(UUID brandId) {
        return brandRepository.findById(brandId).orElseThrow(() -> new NotFoundException("Chưa có brand"));
    }
}
