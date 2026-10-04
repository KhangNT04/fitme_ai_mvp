package com.fitme.address.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fitme.address.entity.ShippingAddress;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AddressDto {
    private UUID id;
    private String recipientName;
    private String phone;
    private String province;
    private String district;
    private String ward;
    private String street;
    @JsonProperty("isDefault")
    private boolean defaultAddress;

    public static AddressDto from(ShippingAddress address) {
        return AddressDto.builder()
                .id(address.getId())
                .recipientName(address.getRecipientName())
                .phone(address.getPhone())
                .province(address.getProvince())
                .district(address.getDistrict())
                .ward(address.getWard())
                .street(address.getStreet())
                .defaultAddress(address.isDefaultAddress())
                .build();
    }
}
