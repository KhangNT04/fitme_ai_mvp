package com.fitme.tryon.controller;

import com.fitme.ai.client.AiVtonClient;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * The free-tier VTON host only wakes for traffic from outside the hosting network, so the
 * browser pings the returned URL while the user is still on the try-on input step.
 */
@RestController
@RequiredArgsConstructor
public class TryOnWarmupController {

    private final AiVtonClient aiVtonClient;

    @GetMapping("/api/v1/try-on/warmup")
    public ApiResponse<Map<String, String>> warmup() {
        aiVtonClient.wakeUpAsync();
        Map<String, String> body = new HashMap<>();
        body.put("url", aiVtonClient.publicHealthUrl().orElse(null));
        return ApiResponse.ok(body);
    }
}
