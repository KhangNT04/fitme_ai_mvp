package com.fitme.common.security;

import com.fitme.session.entity.AnonymousSession;
import com.fitme.session.repository.AnonymousSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class AnonymousSessionFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Anonymous-Session";

    private final AnonymousSessionRepository sessionRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = request.getHeader(HEADER);
        if (token != null && !token.isBlank()) {
            sessionRepository.findBySessionToken(token.trim())
                    .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                    .ifPresent(session -> {
                        session.setLastSeenAt(Instant.now());
                        sessionRepository.save(session);
                        request.setAttribute(RequestContext.ANONYMOUS_SESSION_ATTR, session);
                    });
        }
        filterChain.doFilter(request, response);
    }
}
