package com.fitme.settlement.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PayoutAccountRequest {
    @Size(max = 255, message = "Tên ngân hàng quá dài")
    private String bankName;
    @Size(max = 100, message = "Số tài khoản quá dài")
    private String bankAccountNumber;
    @Size(max = 255, message = "Tên chủ tài khoản quá dài")
    private String bankAccountName;
}
