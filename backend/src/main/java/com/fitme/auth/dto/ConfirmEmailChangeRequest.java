package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Step 2 of the self-service sign-in email change: the code sent to the new address. */
@Data
public class ConfirmEmailChangeRequest {
    @NotBlank(message = "Vui lòng nhập mã xác minh")
    @Pattern(regexp = "\\d{6}", message = "Mã xác minh gồm 6 chữ số")
    private String code;
}
