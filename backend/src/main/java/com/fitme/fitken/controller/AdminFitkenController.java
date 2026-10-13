package com.fitme.fitken.controller;

import com.fitme.admin.audit.AdminAuditAction;
import com.fitme.admin.audit.AdminAuditService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import com.fitme.fitken.dto.AdminFitkenDetailDto;
import com.fitme.fitken.dto.FitkenAdjustRequest;
import com.fitme.fitken.service.FitkenSummaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/consumers/{userId}/fitken")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminFitkenController {

    private final FitkenSummaryService summaryService;
    private final AdminAuditService auditService;

    @GetMapping
    public ApiResponse<AdminFitkenDetailDto> detail(@PathVariable UUID userId) {
        return ApiResponse.ok(summaryService.adminDetail(userId));
    }

    @PostMapping("/adjust")
    public ApiResponse<AdminFitkenDetailDto> adjust(@PathVariable UUID userId,
                                                    @Valid @RequestBody FitkenAdjustRequest request) {
        AdminFitkenDetailDto detail = summaryService.adminAdjust(userId, request.getDelta(), request.getNote());
        String delta = (request.getDelta() > 0 ? "+" : "") + request.getDelta() + " Fitken";
        auditService.record(RequestContext.requireUserId(), AdminAuditAction.FITKEN_ADJUSTED, userId,
                request.getNote() == null || request.getNote().isBlank() ? delta : delta + " · " + request.getNote().trim());
        return ApiResponse.ok(detail);
    }
}
