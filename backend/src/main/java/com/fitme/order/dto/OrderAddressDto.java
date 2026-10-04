package com.fitme.order.dto;

import com.fitme.order.entity.Order;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderAddressDto {
    private String recipientName;
    private String phone;
    private String province;
    private String district;
    private String ward;
    private String street;

    public static OrderAddressDto from(Order order) {
        return OrderAddressDto.builder()
                .recipientName(order.getRecipientName())
                .phone(order.getPhone())
                .province(order.getProvince())
                .district(order.getDistrict())
                .ward(order.getWard())
                .street(order.getStreet())
                .build();
    }
}
