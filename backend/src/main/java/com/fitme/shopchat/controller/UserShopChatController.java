package com.fitme.shopchat.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.shopchat.dto.ShopChatDtos.MessageDto;
import com.fitme.shopchat.dto.ShopChatDtos.OpenThreadRequest;
import com.fitme.shopchat.dto.ShopChatDtos.SendMessageRequest;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDetailDto;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDto;
import com.fitme.shopchat.service.ShopChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/shop-chat")
@RequiredArgsConstructor
public class UserShopChatController {

    private final ShopChatService shopChatService;

    @GetMapping("/threads")
    public ApiResponse<PageResult<ThreadDto>> list(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(shopChatService.listForUser(principal.getUserId(), page, size));
    }

    @PostMapping("/threads")
    public ApiResponse<ThreadDetailDto> open(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                             @Valid @RequestBody OpenThreadRequest request) {
        return ApiResponse.ok(shopChatService.openOrGetForUser(principal.getUserId(), request));
    }

    @GetMapping("/threads/{threadId}")
    public ApiResponse<ThreadDetailDto> get(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                            @PathVariable UUID threadId) {
        return ApiResponse.ok(shopChatService.getForUser(principal.getUserId(), threadId));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ApiResponse<MessageDto> send(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                        @PathVariable UUID threadId,
                                        @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.ok(shopChatService.sendAsUser(principal.getUserId(), threadId, request.getBody()));
    }
}
