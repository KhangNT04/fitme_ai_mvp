package com.fitme.shopchat.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.shopchat.dto.ShopChatDtos.MessageDto;
import com.fitme.shopchat.dto.ShopChatDtos.SendMessageRequest;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDetailDto;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDto;
import com.fitme.shopchat.service.ShopChatService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/shop-chat")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminShopChatController {

    private final ShopChatService shopChatService;

    @GetMapping("/threads")
    public ApiResponse<PageResult<ThreadDto>> list(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(shopChatService.listForAdmin(page, size));
    }

    @GetMapping("/threads/{threadId}")
    public ApiResponse<ThreadDetailDto> get(@PathVariable UUID threadId) {
        return ApiResponse.ok(shopChatService.getForAdmin(threadId));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ApiResponse<MessageDto> send(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                        @PathVariable UUID threadId,
                                        @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.ok(shopChatService.sendAsAdmin(principal.getUserId(), threadId, request.getBody()));
    }

    @PostMapping("/threads/{threadId}/status")
    public ApiResponse<Void> status(@PathVariable UUID threadId, @RequestBody StatusRequest body) {
        shopChatService.setStatus(threadId, body.getStatus(), null);
        return ApiResponse.ok(null);
    }

    @Data
    public static class StatusRequest {
        private String status;
    }
}
