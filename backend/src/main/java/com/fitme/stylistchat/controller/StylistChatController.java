package com.fitme.stylistchat.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.stylistchat.dto.StylistChatMessageRequest;
import com.fitme.stylistchat.dto.StylistChatMessageResponse;
import com.fitme.stylistchat.dto.StylistConversationDto;
import com.fitme.stylistchat.service.StylistChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stylist/chat")
@RequiredArgsConstructor
public class StylistChatController {

    private final StylistChatService stylistChatService;

    @PostMapping("/messages")
    public ApiResponse<StylistChatMessageResponse> sendMessage(
            @Valid @RequestBody StylistChatMessageRequest request) {
        return ApiResponse.ok(stylistChatService.sendMessage(request));
    }

    @PostMapping("/starter-outfits")
    public ApiResponse<StylistChatMessageResponse> generateStarterOutfits() {
        return ApiResponse.ok(stylistChatService.generateStarterOutfits());
    }

    @GetMapping("/conversations")
    public ApiResponse<List<StylistConversationDto>> listConversations() {
        return ApiResponse.ok(stylistChatService.listConversations());
    }

    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<StylistConversationDto> getMessages(@PathVariable UUID id) {
        return ApiResponse.ok(stylistChatService.getConversation(id));
    }
}
