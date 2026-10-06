package com.fitme.address.service;

import com.fitme.address.dto.AddressDto;
import com.fitme.address.dto.AddressRequest;
import com.fitme.address.entity.ShippingAddress;
import com.fitme.address.repository.ShippingAddressRepository;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AddressService {

    private static final String NOT_FOUND = "Địa chỉ không tồn tại";
    private static final Pattern VN_PHONE = Pattern.compile("^(\\+84|0)\\d{9,10}$");

    private final ShippingAddressRepository addressRepository;

    public List<AddressDto> list(UUID userId) {
        return addressRepository.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(userId).stream()
                .map(AddressDto::from)
                .toList();
    }

    @Transactional
    public AddressDto create(UUID userId, AddressRequest request) {
        validate(request);
        boolean makeDefault = request.isDefaultAddress() || !addressRepository.existsByUserId(userId);
        if (makeDefault) {
            addressRepository.clearDefault(userId);
        }
        ShippingAddress address = ShippingAddress.builder().userId(userId).build();
        apply(address, request, makeDefault);
        return AddressDto.from(addressRepository.save(address));
    }

    @Transactional
    public AddressDto update(UUID userId, UUID id, AddressRequest request) {
        validate(request);
        if (request.isDefaultAddress()) {
            addressRepository.clearDefault(userId);
        }
        ShippingAddress address = requireOwned(userId, id);
        apply(address, request, request.isDefaultAddress());
        return AddressDto.from(addressRepository.save(address));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        addressRepository.delete(requireOwned(userId, id));
    }

    public ShippingAddress requireOwned(UUID userId, UUID id) {
        return addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException(NOT_FOUND));
    }

    private static void apply(ShippingAddress address, AddressRequest request, boolean makeDefault) {
        address.setRecipientName(request.getRecipientName().trim());
        address.setPhone(normalizePhone(request.getPhone()));
        address.setProvince(request.getProvince());
        address.setDistrict(request.getDistrict());
        address.setWard(request.getWard());
        address.setStreet(request.getStreet());
        address.setDefaultAddress(makeDefault);
    }

    private static void validate(AddressRequest request) {
        if (isBlank(request.getRecipientName()) || isBlank(request.getPhone())
                || request.getProvince() == null || request.getDistrict() == null
                || request.getWard() == null || request.getStreet() == null) {
            throw new BusinessException("Thông tin địa chỉ chưa đầy đủ");
        }
        if (!VN_PHONE.matcher(normalizePhone(request.getPhone())).matches()) {
            throw new BusinessException("Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)", "INVALID_PHONE");
        }
    }

    private static String normalizePhone(String phone) {
        return phone.replaceAll("[\\s.\\-()]", "");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
