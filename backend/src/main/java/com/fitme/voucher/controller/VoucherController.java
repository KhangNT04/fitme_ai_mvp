package com.fitme.voucher.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import com.fitme.voucher.dto.UserVoucherDto;
import com.fitme.voucher.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping
    public ApiResponse<List<UserVoucherDto>> list() {
        UUID userId = RequestContext.getCurrentUserId()
                .orElseThrow(() -> new BusinessException("Cần đăng nhập để xem voucher"));
        return ApiResponse.ok(voucherService.listForUser(userId));
    }
}
