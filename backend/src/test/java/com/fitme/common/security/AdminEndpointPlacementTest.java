package com.fitme.common.security;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Admin 2FA enforcement ({@link AdminMfaInterceptor}) only covers /api/v1/admin/**. */
class AdminEndpointPlacementTest extends AbstractIntegrationTest {

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void everyAdminOnlyEndpointLivesUnderTheAdminPrefix() {
        List<String> misplaced = new ArrayList<>();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMapping.getHandlerMethods().entrySet()) {
            HandlerMethod handler = entry.getValue();
            PreAuthorize rule = AnnotatedElementUtils.findMergedAnnotation(handler.getMethod(), PreAuthorize.class);
            if (rule == null) {
                rule = AnnotatedElementUtils.findMergedAnnotation(handler.getBeanType(), PreAuthorize.class);
            }
            if (rule == null || !rule.value().contains("ADMIN") || rule.value().contains("BRAND")) {
                continue;
            }
            for (String pattern : entry.getKey().getPatternValues()) {
                if (!pattern.startsWith("/api/v1/admin/")) {
                    misplaced.add(pattern + " -> " + handler.getShortLogMessage());
                }
            }
        }
        assertThat(misplaced).isEmpty();
    }
}
