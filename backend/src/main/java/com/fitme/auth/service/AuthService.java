package com.fitme.auth.service;

import com.fitme.auth.dto.*;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final long PASSWORD_RESET_TTL_SECONDS = 3600;

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ConcurrentHashMap<String, PasswordResetEntry> passwordResetTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UUID> emailVerificationTokens = new ConcurrentHashMap<>();

    private record PasswordResetEntry(String email, Instant expiresAt) {}

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userAccountRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email đã được sử dụng");
        }
        UserAccount user = UserAccount.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null ? request.getDisplayName() : request.getEmail())
                .role(UserRole.USER)
                .emailVerified(true)
                .build();
        user = userAccountRepository.save(user);
        String verifyToken = UUID.randomUUID().toString();
        emailVerificationTokens.put(verifyToken, user.getId());
        log.info("[MOCK] Email verification token for {}: {}", user.getEmail(), verifyToken);
        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase().trim(), request.getPassword()));
        UserAccount user = userAccountRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        return buildAuthResponse(user);
    }

    @Transactional
    public void verifyEmail(TokenRequest request) {
        UUID userId = emailVerificationTokens.remove(request.getToken());
        if (userId == null) {
            throw new BusinessException("Token xác thực không hợp lệ");
        }
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        user.setEmailVerified(true);
        userAccountRepository.save(user);
    }

    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        userAccountRepository.findByEmail(request.getEmail().toLowerCase().trim()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            passwordResetTokens.put(token, new PasswordResetEntry(
                    user.getEmail(), Instant.now().plusSeconds(PASSWORD_RESET_TTL_SECONDS)));
            log.info("[MOCK] Password reset token for {}: {}", user.getEmail(), token);
        });
        return Map.of("message", "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi");
    }

    public java.util.Optional<String> findResetTokenForEmail(String email) {
        String normalized = email.toLowerCase().trim();
        return passwordResetTokens.entrySet().stream()
                .filter(e -> e.getValue().email().equalsIgnoreCase(normalized))
                .filter(e -> Instant.now().isBefore(e.getValue().expiresAt()))
                .map(java.util.Map.Entry::getKey)
                .findFirst();
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetEntry entry = passwordResetTokens.remove(request.getToken());
        if (entry == null) {
            throw new BusinessException("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            throw new BusinessException("Token đặt lại mật khẩu đã hết hạn");
        }
        UserAccount user = userAccountRepository.findByEmail(entry.email())
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userAccountRepository.save(user);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (jwtService.isRefreshTokenRevoked(token) || !jwtService.isRefreshToken(token)) {
            throw new BusinessException("Refresh token không hợp lệ");
        }
        UUID userId = jwtService.getUserId(token);
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        return buildAuthResponse(user);
    }

    public void logout(RefreshTokenRequest request) {
        jwtService.revokeRefreshToken(request.getRefreshToken());
    }

    private AuthResponse buildAuthResponse(UserAccount user) {
        String access = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());
        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole().name())
                .accessToken(access)
                .refreshToken(refresh)
                .emailVerified(user.isEmailVerified())
                .build();
    }
}
