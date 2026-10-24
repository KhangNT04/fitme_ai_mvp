package com.fitme.privacy.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.privacy.dto.AccountDeletionStatusDto;
import com.fitme.privacy.dto.DeleteMyAccountRequest;
import com.fitme.privacy.service.AccountDeletionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tự xoá tài khoản của chính mình. Tách khỏi {@link PrivacyController} vì đây là luồng có xác nhận
 * mật khẩu và hệ thống tự xử lý sau grace period — không cần admin duyệt.
 */
@RestController
@RequestMapping("/api/v1/me/account-deletion")
@RequiredArgsConstructor
public class AccountDeletionController {

    private final AccountDeletionService accountDeletionService;

    /** Đặt lịch xoá tài khoản sau grace period. */
    @PostMapping
    public ApiResponse<AccountDeletionStatusDto> requestDeletion(@Valid @RequestBody DeleteMyAccountRequest request) {
        return ApiResponse.ok(accountDeletionService.requestDeletion(request));
    }

    /** Huỷ yêu cầu đang chờ; tài khoản dùng lại bình thường. */
    @PostMapping("/cancel")
    public ApiResponse<AccountDeletionStatusDto> cancelDeletion(@RequestBody(required = false) CancelRequest request) {
        return ApiResponse.ok(accountDeletionService.cancelDeletion(request == null ? null : request.reason()));
    }

    /** Trạng thái yêu cầu hiện tại (null-status khi chưa yêu cầu xoá). */
    @GetMapping
    public ApiResponse<AccountDeletionStatusDto> status() {
        return ApiResponse.ok(accountDeletionService.status());
    }

    /** Body tuỳ chọn cho huỷ yêu cầu. */
    public record CancelRequest(String reason) {
    }
}
