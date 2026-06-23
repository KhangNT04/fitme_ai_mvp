package com.fitme.session.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.session.dto.AnonymousSessionResponse;
import com.fitme.session.dto.LinkSessionRequest;
import com.fitme.session.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping("/anonymous")
    public ApiResponse<AnonymousSessionResponse> createAnonymous() {
        return ApiResponse.ok(sessionService.createAnonymousSession());
    }

    @GetMapping("/current")
    public ApiResponse<AnonymousSessionResponse> getCurrent() {
        return ApiResponse.ok(sessionService.getCurrentSession());
    }

    @PostMapping("/link-to-user")
    public ApiResponse<Void> linkToUser(@Valid @RequestBody LinkSessionRequest request) {
        sessionService.linkToUser(request.getSessionToken());
        return ApiResponse.ok(null);
    }
}
