package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Inline display-name change from the profile page. */
@Data
public class UpdateDisplayNameRequest {
    @NotBlank(message = "Vui lòng nhập tên hiển thị")
    @Size(max = 80, message = "Tên hiển thị tối đa 80 ký tự")
    private String displayName;
}
