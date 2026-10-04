package com.fitme.address.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddressRequest {
    @Size(max = 255, message = "Tên người nhận quá dài")
    private String recipientName;
    @Size(max = 30, message = "Số điện thoại quá dài")
    private String phone;
    @Size(max = 100, message = "Tỉnh / thành phố quá dài")
    private String province;
    @Size(max = 100, message = "Quận / huyện quá dài")
    private String district;
    @Size(max = 100, message = "Phường / xã quá dài")
    private String ward;
    private String street;
    @JsonProperty("isDefault")
    private boolean defaultAddress;
}
