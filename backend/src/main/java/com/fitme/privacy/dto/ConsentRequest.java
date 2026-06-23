package com.fitme.privacy.dto;

import com.fitme.common.enums.ConsentType;
import com.fitme.common.enums.DeletionRequestType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConsentRequest {
    @NotNull
    private ConsentType consentType;
    private boolean accepted = true;
}
