package com.fitme.common.security;

import com.fitme.common.exception.BusinessException;

import java.util.UUID;

public final class OwnershipChecker {

    private OwnershipChecker() {
    }

    public static void verify(UUID resourceUserId, UUID resourceSessionId) {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null && userId.equals(resourceUserId)) {
            return;
        }
        if (sessionId != null && sessionId.equals(resourceSessionId)) {
            return;
        }
        throw new BusinessException("Không có quyền truy cập tài nguyên này");
    }
}
