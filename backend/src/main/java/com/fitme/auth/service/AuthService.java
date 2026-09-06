package com.fitme.auth.service;

import com.fitme.auth.dto.*;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
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

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final long PASSWORD_RESET_TTL_SECONDS = 3600;
    private static final long CAPTCHA_TTL_SECONDS = 600;
    private static final long REGISTER_COOLDOWN_SECONDS = 60;

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FitMeProperties fitMeProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    private final ConcurrentHashMap<String, PasswordResetEntry> passwordResetTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CaptchaEntry> captchaChallenges = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> registerCooldownByEmail = new ConcurrentHashMap<>();

    private record PasswordResetEntry(String email, Instant expiresAt) {}
    private record CaptchaEntry(int answer, Instant expiresAt) {}

    public CaptchaChallengeResponse createCaptchaChallenge() {
        purgeExpiredCaptchas();
        int a = 2 + secureRandom.nextInt(8);
        int b = 1 + secureRandom.nextInt(9);
        String id = UUID.randomUUID().toString();
        captchaChallenges.put(id, new CaptchaEntry(a + b, Instant.now().plusSeconds(CAPTCHA_TTL_SECONDS)));
        return CaptchaChallengeResponse.builder()
                .captchaId(id)
                .question(a + " + " + b + " = ?")
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        rejectHoneypot(request.getWebsite());
        enforceFormTiming(request.getFormStartedAtMs());
        verifyCaptcha(request.getCaptchaId(), request.getCaptchaAnswer());

        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        enforceRegisterCooldown(email);

        if (userAccountRepository.existsByEmail(email)) {
            throw new BusinessException("Email đã được sử dụng");
        }

        String code = generateNumericCode(6);
        Instant expiresAt = Instant.now().plusSeconds(
                Math.max(60, fitMeProperties.getAuth().getVerificationTtlSeconds()));

        UserAccount user = UserAccount.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null && !request.getDisplayName().isBlank()
                        ? request.getDisplayName().trim()
                        : email)
                .role(UserRole.USER)
                .emailVerified(false)
                .emailVerificationCode(code)
                .emailVerificationExpiresAt(expiresAt)
                .build();
        user = userAccountRepository.save(user);
        registerCooldownByEmail.put(email, Instant.now().plusSeconds(REGISTER_COOLDOWN_SECONDS));

        log.info("[AUTH] Registered pending verification email={} expiresAt={}", email, expiresAt);
        if (fitMeProperties.getAuth().isExposeVerificationCode()) {
            log.info("[AUTH] Verification code for {}: {}", email, code);
        }

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole().name())
                .emailVerified(false)
                .requiresEmailVerification(true)
                .message("Đăng ký thành công. Nhập mã xác nhận để kích hoạt tài khoản.")
                .consumerPlan(user.getConsumerPlan() != null ? user.getConsumerPlan().name() : "FREE");

        if (fitMeProperties.getAuth().isExposeVerificationCode()) {
            builder.verificationCode(code);
        }
        return builder.build();
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        if (!user.isEmailVerified()) {
            throw new BusinessException(
                    "Tài khoản chưa xác nhận email. Vui lòng nhập mã xác minh trước khi đăng nhập.");
        }
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse verifyEmail(TokenRequest request) {
        UserAccount user = resolvePendingUser(request);
        if (user.getEmailVerificationExpiresAt() != null
                && Instant.now().isAfter(user.getEmailVerificationExpiresAt())) {
            throw new BusinessException("Mã xác thực đã hết hạn. Hãy yêu cầu gửi lại mã.");
        }
        user.setEmailVerified(true);
        user.setEmailVerificationCode(null);
        user.setEmailVerificationExpiresAt(null);
        userAccountRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public Map<String, String> resendVerification(ResendVerificationRequest request) {
        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        java.util.Optional<UserAccount> found = userAccountRepository.findByEmail(email);
        if (found.isEmpty() || found.get().isEmailVerified()) {
            return Map.of("message", "Nếu email tồn tại và chưa xác minh, mã mới đã được tạo.");
        }
        UserAccount user = found.get();
        String code = generateNumericCode(6);
        user.setEmailVerificationCode(code);
        user.setEmailVerificationExpiresAt(Instant.now().plusSeconds(
                Math.max(60, fitMeProperties.getAuth().getVerificationTtlSeconds())));
        userAccountRepository.save(user);
        if (fitMeProperties.getAuth().isExposeVerificationCode()) {
            log.info("[AUTH] Resent verification code for {}: {}", email, code);
            return Map.of(
                    "message", "Mã xác minh mới đã được tạo.",
                    "verificationCode", code);
        }
        return Map.of("message", "Nếu email tồn tại và chưa xác minh, mã mới đã được tạo.");
    }

    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        userAccountRepository.findByEmail(request.getEmail().toLowerCase(Locale.ROOT).trim()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            passwordResetTokens.put(token, new PasswordResetEntry(
                    user.getEmail(), Instant.now().plusSeconds(PASSWORD_RESET_TTL_SECONDS)));
            log.info("[MOCK] Password reset token for {}: {}", user.getEmail(), token);
        });
        return Map.of("message", "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi");
    }

    public java.util.Optional<String> findResetTokenForEmail(String email) {
        String normalized = email.toLowerCase(Locale.ROOT).trim();
        return passwordResetTokens.entrySet().stream()
                .filter(e -> e.getValue().email().equalsIgnoreCase(normalized))
                .filter(e -> Instant.now().isBefore(e.getValue().expiresAt()))
                .map(Map.Entry::getKey)
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
        try {
            if (jwtService.isRefreshTokenRevoked(token) || !jwtService.isRefreshToken(token)) {
                throw new BusinessException("Refresh token không hợp lệ");
            }
            UUID userId = jwtService.getUserId(token);
            UserAccount user = userAccountRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
            if (!user.isEmailVerified()) {
                throw new BusinessException("Tài khoản chưa xác nhận email");
            }
            return buildAuthResponse(user);
        } catch (io.jsonwebtoken.JwtException ex) {
            throw new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
    }

    public void logout(RefreshTokenRequest request) {
        jwtService.revokeRefreshToken(request.getRefreshToken());
    }

    private UserAccount resolvePendingUser(TokenRequest request) {
        String token = request.getToken().trim();
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
            UserAccount user = userAccountRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
            if (user.isEmailVerified()) {
                return user;
            }
            if (user.getEmailVerificationCode() == null
                    || !user.getEmailVerificationCode().equalsIgnoreCase(token)) {
                throw new BusinessException("Mã xác thực không hợp lệ");
            }
            return user;
        }
        return userAccountRepository.findByEmailVerificationCode(token)
                .filter(u -> !u.isEmailVerified())
                .orElseThrow(() -> new BusinessException("Token xác thực không hợp lệ"));
    }

    private void rejectHoneypot(String website) {
        if (website != null && !website.isBlank()) {
            throw new BusinessException("Đăng ký bị từ chối");
        }
    }

    private void enforceFormTiming(Long formStartedAtMs) {
        long minMs = Math.max(0, fitMeProperties.getAuth().getMinFormMs());
        if (minMs <= 0) {
            return;
        }
        if (formStartedAtMs == null) {
            throw new BusinessException("Thiếu xác nhận chống spam. Tải lại trang và thử lại.");
        }
        long elapsed = Instant.now().toEpochMilli() - formStartedAtMs;
        if (elapsed < minMs) {
            throw new BusinessException("Đăng ký quá nhanh. Vui lòng thử lại.");
        }
        if (elapsed > 86_400_000L) {
            throw new BusinessException("Phiên đăng ký đã hết hạn. Tải lại trang và thử lại.");
        }
    }

    private void verifyCaptcha(String captchaId, String captchaAnswer) {
        CaptchaEntry entry = captchaChallenges.remove(captchaId);
        if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
            throw new BusinessException("Mã xác nhận đã hết hạn. Tải lại câu hỏi và thử lại.");
        }
        String normalized = captchaAnswer == null ? "" : captchaAnswer.trim();
        int answer;
        try {
            answer = Integer.parseInt(normalized);
        } catch (NumberFormatException ex) {
            throw new BusinessException("Đáp án xác nhận không hợp lệ");
        }
        if (answer != entry.answer()) {
            throw new BusinessException("Đáp án xác nhận không đúng");
        }
    }

    private void enforceRegisterCooldown(String email) {
        Instant until = registerCooldownByEmail.get(email);
        if (until != null && Instant.now().isBefore(until)) {
            throw new BusinessException("Bạn vừa đăng ký email này. Vui lòng đợi một phút rồi thử lại.");
        }
    }

    private void purgeExpiredCaptchas() {
        Instant now = Instant.now();
        captchaChallenges.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    }

    private String generateNumericCode(int digits) {
        int bound = (int) Math.pow(10, digits);
        int value = secureRandom.nextInt(bound / 10, bound);
        return String.valueOf(value);
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
                .requiresEmailVerification(false)
                .consumerPlan(user.getConsumerPlan() != null ? user.getConsumerPlan().name() : "FREE")
                .build();
    }
}
