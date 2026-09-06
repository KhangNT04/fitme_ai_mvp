package com.fitme.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CaptchaChallengeResponse {
    private String captchaId;
    private String question;
}
