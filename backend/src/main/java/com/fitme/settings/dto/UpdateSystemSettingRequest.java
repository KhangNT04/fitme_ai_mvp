package com.fitme.settings.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateSystemSettingRequest {
    /** Accepts a JSON number or string; parsed and range-checked per setting. */
    @NotBlank(message = "Vui lòng nhập giá trị")
    private String value;
}
