package com.fitme.admin.controller;

import com.fitme.admin.dto.AdminCredentialsRequest;
import com.fitme.admin.dto.AdminUserDto;
import com.fitme.admin.service.AdminUserService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<AdminUserDto.Page> list(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) String role,
                                               @RequestParam(required = false) String status,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminUserService.list(q, parse(UserRole.class, role), parse(UserStatus.class, status),
                page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserDto> get(@PathVariable UUID id) {
        return ApiResponse.ok(adminUserService.get(id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserDto> setStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        UserStatus status = parse(UserStatus.class, body.get("status"));
        if (status == null) {
            throw new BusinessException("Trạng thái không hợp lệ (ACTIVE hoặc SUSPENDED)");
        }
        return ApiResponse.ok(adminUserService.setStatus(RequestContext.requireUserId(), id, status));
    }

    @PatchMapping("/{id}/credentials")
    public ApiResponse<AdminUserDto> updateCredentials(@PathVariable UUID id,
                                                       @Valid @RequestBody AdminCredentialsRequest body) {
        return ApiResponse.ok(adminUserService.updateCredentials(RequestContext.requireUserId(), id, body));
    }

    private static <E extends Enum<E>> E parse(Class<E> type, String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Giá trị lọc không hợp lệ: " + raw);
        }
    }
}
