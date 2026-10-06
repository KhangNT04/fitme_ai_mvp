package com.fitme.privacy.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.ConsentType;
import com.fitme.privacy.dto.ConsentRequest;
import com.fitme.privacy.dto.DeletionRequestDto;
import com.fitme.privacy.entity.ConsentRecord;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.privacy.service.PrivacyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/privacy")
@RequiredArgsConstructor
public class PrivacyController {

    private final PrivacyService privacyService;

    @PostMapping("/consent")
    public ApiResponse<ConsentRecord> consent(@Valid @RequestBody ConsentRequest request) {
        return ApiResponse.ok(privacyService.recordConsent(request));
    }

    @GetMapping("/consent")
    public ApiResponse<Map<ConsentType, Boolean>> currentConsents() {
        return ApiResponse.ok(privacyService.currentConsents());
    }

    @PostMapping("/deletion-requests")
    public ApiResponse<DataDeletionRequest> requestDeletion(@Valid @RequestBody DeletionRequestDto request) {
        return ApiResponse.ok(privacyService.requestDeletion(request));
    }
}
