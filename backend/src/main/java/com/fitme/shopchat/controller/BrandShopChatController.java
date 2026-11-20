package com.fitme.shopchat.controller;

import com.fitme.brand.service.BrandService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/inbox")
@RequiredArgsConstructor
public class BrandShopChatController {

    private final ShopChatService shopChatService;
    private final BrandService brandService;

    @GetMapping("/threads")
    public ApiResponse<PageResult<ThreadDto>> list(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(shopChatService.listForBrandOwner(principal.getUserId(), page, size));
    }

    @GetMapping("/threads/{threadId}")
    public ApiResponse<ThreadDetailDto> get(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                            @PathVariable UUID threadId) {
        return ApiResponse.ok(shopChatService.getForBrand(principal.getUserId(), threadId));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ApiResponse<MessageDto> send(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                        @PathVariable UUID threadId,
                                        @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.ok(shopChatService.sendAsBrand(principal.getUserId(), threadId, request.getBody()));
    }

    @PostMapping("/threads/{threadId}/status")
    public ApiResponse<Void> status(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                    @PathVariable UUID threadId,
                                    @RequestBody StatusRequest body) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        shopChatService.setStatus(threadId, body.getStatus(), brandId);
        return ApiResponse.ok(null);
    }

    @Data
    public static class StatusRequest {
        private String status;
    }
}
