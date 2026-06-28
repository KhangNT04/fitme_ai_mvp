package com.fitme.auth.controller;

import com.fitme.auth.service.AuthService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "fitme.test.expose-reset-tokens", havingValue = "true")
public class TestAuthController {

    private final AuthService authService;
    private final FitMeProperties fitMeProperties;

    @GetMapping("/password-reset-token")
    public ApiResponse<Map<String, String>> passwordResetToken(@RequestParam String email) {
        if (!fitMeProperties.getTest().isExposeResetTokens()) {
            throw new BusinessException("Test endpoints disabled");
        }
        return authService.findResetTokenForEmail(email)
                .map(token -> ApiResponse.ok(Map.of("token", token)))
                .orElseThrow(() -> new BusinessException("Không tìm thấy token cho email này"));
    }
}
