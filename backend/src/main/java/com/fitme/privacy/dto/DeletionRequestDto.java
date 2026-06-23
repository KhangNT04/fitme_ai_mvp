package com.fitme.privacy.dto;

import com.fitme.common.enums.DeletionRequestType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeletionRequestDto {
    @NotNull
    private DeletionRequestType requestType;
}
