package com.fitme.session.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AnonymousSessionResponse {
    private UUID sessionId;
    private String sessionToken;
    private String privacyVersion;
}
