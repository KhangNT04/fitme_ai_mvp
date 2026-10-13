package com.fitme.admin.audit;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/audit-log")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditController {

    private final AdminAuditService auditService;

    @GetMapping
    public ApiResponse<AdminAuditEntryDto.Page> list(@RequestParam(required = false) String q,
                                                     @RequestParam(required = false) String action,
                                                     @RequestParam(required = false) UUID targetUserId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.ok(auditService.list(q, parseAction(action), targetUserId, page, size));
    }

    private static AdminAuditAction parseAction(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return AdminAuditAction.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Loại hành động không hợp lệ: " + raw);
        }
    }
}
