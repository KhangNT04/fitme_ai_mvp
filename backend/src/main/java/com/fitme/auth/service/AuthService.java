package com.fitme.auth.service;

import com.fitme.auth.dto.*;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.TooManyRequestsException;
import com.fitme.common.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
    private static final long EMAIL_SEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_VERIFICATION_ATTEMPTS = 5;
    private static final int MAX_LOGIN_FAILURES = 5;
    private static final long LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;
    private static final long LOGIN_LOCK_SECONDS = 15 * 60;
    private static final String RESEND_VERIFICATION_MESSAGE =
            "Nếu email tồn tại và chưa xác minh, mã mới đã được gửi tới hộp thư.";
    public static final String ACCOUNT_LOCKED_MESSAGE = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ FitMe để được hỗ trợ.";

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FitMeProperties fitMeProperties;
    private final AuthEmailService authEmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    private final ConcurrentHashMap<String, CaptchaEntry> captchaChallenges = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> registerCooldownByEmail = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> resendCooldownByEmail = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> resetCooldownByEmail = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> verificationFailuresByEmail = new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, LoginFailures> loginFailuresByEmail = new ConcurrentHashMap<>();

    private record CaptchaEntry(int answer, Instant expiresAt) {}

    private record LoginFailures(int count, Instant windowStart, Instant lockedUntil) {}

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
                .signupSource(attribution(request.getUtmSource(), 100))
                .signupMedium(attribution(request.getUtmMedium(), 100))
                .signupCampaign(attribution(request.getUtmCampaign(), 150))
                .signupReferrer(attribution(request.getReferrer(), 255))
                .build();
        user = userAccountRepository.save(user);
        registerCooldownByEmail.put(email, Instant.now().plusSeconds(REGISTER_COOLDOWN_SECONDS));

        log.info("[AUTH] Registered pending verification email={} expiresAt={}", email, expiresAt);
        authEmailService.sendVerificationCode(email, code);

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole().name())
                .emailVerified(false)
                .requiresEmailVerification(true)
                .message("Đăng ký thành công. Kiểm tra email và nhập mã xác nhận để kích hoạt tài khoản.")
                .consumerPlan(user.getConsumerPlan() != null ? user.getConsumerPlan().name() : "FREE");

        if (fitMeProperties.getAuth().isExposeVerificationCode()) {
            builder.verificationCode(code);
        }
        return builder.build();
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        rejectWhileLoginLocked(email);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
            loginFailuresByEmail.remove(email);
        } catch (BadCredentialsException ex) {
            recordLoginFailure(email);
            throw ex;
        } catch (AccountStatusException ex) {
            // Spring checks the account status before the password; only reveal the lock to the real owner.
            boolean passwordMatches = userAccountRepository.findByEmail(email)
                    .map(u -> passwordEncoder.matches(request.getPassword(), u.getPasswordHash()))
                    .orElse(false);
            if (!passwordMatches) {
                throw new BadCredentialsException("Bad credentials");
            }
            throw new BusinessException(ACCOUNT_LOCKED_MESSAGE, "ACCOUNT_LOCKED");
        }
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        if (!user.isEmailVerified()) {
            throw new BusinessException(
                    "Tài khoản chưa xác nhận email. Vui lòng nhập mã xác minh trước khi đăng nhập.");
        }
        return buildAuthResponse(user);
    }

    @Transactional(noRollbackFor = BusinessException.class)
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
        // Unknown, verified and unverified emails must look identical (message and cooldown) to callers.
        if (inCooldown(resendCooldownByEmail, email)) {
            throw new BusinessException("Vui lòng đợi 1 phút trước khi gửi lại mã.");
        }
        resendCooldownByEmail.put(email, Instant.now().plusSeconds(EMAIL_SEND_COOLDOWN_SECONDS));
        java.util.Optional<UserAccount> found = userAccountRepository.findByEmail(email);
        if (found.isEmpty() || found.get().isEmailVerified()) {
            return Map.of("message", RESEND_VERIFICATION_MESSAGE);
        }
        verificationFailuresByEmail.remove(email);
        UserAccount user = found.get();
        String code = generateNumericCode(6);
        user.setEmailVerificationCode(code);
        user.setEmailVerificationExpiresAt(Instant.now().plusSeconds(
                Math.max(60, fitMeProperties.getAuth().getVerificationTtlSeconds())));
        userAccountRepository.save(user);
        authEmailService.sendVerificationCode(email, code);
        if (fitMeProperties.getAuth().isExposeVerificationCode()) {
            return Map.of(
                    "message", "Đã gửi mã xác minh mới tới email của bạn.",
                    "verificationCode", code);
        }
        return Map.of("message", RESEND_VERIFICATION_MESSAGE);
    }

    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        userAccountRepository.findByEmail(email).ifPresent(user -> {
            if (inCooldown(resetCooldownByEmail, email)) {
                log.info("[AUTH] Password reset email to {} skipped (cooldown)", email);
                return;
            }
            resetCooldownByEmail.put(email, Instant.now().plusSeconds(EMAIL_SEND_COOLDOWN_SECONDS));
            String token = issuePasswordResetToken(user);
            if (fitMeProperties.getAuth().isExposeVerificationCode()) {
                log.info("[DEV] Password reset token for {}: {}", user.getEmail(), token);
            }
            try {
                authEmailService.sendPasswordResetLink(
                        user.getEmail(), token, (int) (PASSWORD_RESET_TTL_SECONDS / 60));
            } catch (RuntimeException ex) {
                // Same response either way so the endpoint never reveals which emails exist.
                log.warn("[AUTH] Password reset email to {} failed: {}", user.getEmail(), ex.getMessage());
            }
        });
        return Map.of("message", "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi");
    }

    /** Test-only helper (E2E): issues a fresh reset token for the account. */
    public java.util.Optional<String> findResetTokenForEmail(String email) {
        return userAccountRepository.findByEmail(email.toLowerCase(Locale.ROOT).trim())
                .map(this::issuePasswordResetToken);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        UUID userId = jwtService.resolvePasswordResetUser(request.getToken().trim(),
                        id -> userAccountRepository.findById(id).map(UserAccount::getPasswordHash).orElse(null))
                .orElseThrow(() -> new BusinessException(
                        "Link đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng"));
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(Instant.now());
        userAccountRepository.save(user);
    }

    /** Changes the password, signs out every other session and returns fresh tokens for the caller. */
    @Transactional
    public AuthResponse changePassword(UUID userId, ChangePasswordRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(Instant.now());
        userAccountRepository.save(user);
        if (request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            jwtService.revokeRefreshToken(request.getRefreshToken());
        }
        log.info("[AUTH] Password changed for user {}", userId);
        return buildAuthResponse(user);
    }

    private String issuePasswordResetToken(UserAccount user) {
        return jwtService.generatePasswordResetToken(
                user.getId(), user.getEmail(), user.getPasswordHash(), PASSWORD_RESET_TTL_SECONDS * 1000);
    }

    private static String attribution(String raw, int maxLength) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.trim().replaceAll("\\s+", " ");
        return cleaned.length() > maxLength ? cleaned.substring(0, maxLength) : cleaned;
    }

    private void rejectWhileLoginLocked(String email) {
        LoginFailures failures = loginFailuresByEmail.get(email);
        if (failures == null || failures.lockedUntil() == null) {
            return;
        }
        Instant now = Instant.now();
        if (now.isBefore(failures.lockedUntil())) {
            long minutes = Math.max(1, (failures.lockedUntil().getEpochSecond() - now.getEpochSecond() + 59) / 60);
            throw new TooManyRequestsException(
                    "Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau " + minutes + " phút.",
                    "LOGIN_LOCKED");
        }
        loginFailuresByEmail.remove(email, failures);
    }

    private void recordLoginFailure(String email) {
        Instant now = Instant.now();
        LoginFailures updated = loginFailuresByEmail.compute(email, (key, current) -> {
            if (current == null || now.isAfter(current.windowStart().plusSeconds(LOGIN_FAILURE_WINDOW_SECONDS))) {
                return new LoginFailures(1, now, null);
            }
            int count = current.count() + 1;
            return new LoginFailures(count, current.windowStart(),
                    count >= MAX_LOGIN_FAILURES ? now.plusSeconds(LOGIN_LOCK_SECONDS) : null);
        });
        if (updated.lockedUntil() != null) {
            log.warn("[AUTH] Login locked for {} after {} failed attempts", email, updated.count());
        }
    }

    private static boolean inCooldown(ConcurrentHashMap<String, Instant> cooldowns, String email) {
        Instant until = cooldowns.get(email);
        if (until == null) {
            return false;
        }
        if (Instant.now().isAfter(until)) {
            cooldowns.remove(email, until);
            return false;
        }
        return true;
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
            if (jwtService.issuedBeforePasswordChange(token, user.getPasswordChangedAt())) {
                throw new BusinessException("Mật khẩu đã được đổi. Vui lòng đăng nhập lại");
            }
            AuthResponse response = buildAuthResponse(user);
            jwtService.revokeRefreshToken(token);
            return response;
        } catch (io.jsonwebtoken.JwtException ex) {
            throw new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
    }

    public void logout(RefreshTokenRequest request) {
        jwtService.revokeRefreshToken(request.getRefreshToken());
    }

    /**
     * Never issues tokens without a matching code: already-verified accounts must log in with their password,
     * and repeated wrong codes burn the code so a 6-digit value cannot be brute-forced.
     */
    private UserAccount resolvePendingUser(TokenRequest request) {
        String token = request.getToken().trim();
        String email = request.getEmail().toLowerCase(Locale.ROOT).trim();
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Mã xác thực không hợp lệ"));
        if (user.isEmailVerified()) {
            throw new BusinessException("Email này đã được xác minh. Vui lòng đăng nhập.");
        }
        String expected = user.getEmailVerificationCode();
        if (expected == null) {
            throw new BusinessException("Mã xác thực đã hết hiệu lực. Hãy yêu cầu gửi lại mã.");
        }
        if (!MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            int failures = verificationFailuresByEmail.merge(email, 1, Integer::sum);
            if (failures >= MAX_VERIFICATION_ATTEMPTS) {
                verificationFailuresByEmail.remove(email);
                user.setEmailVerificationCode(null);
                user.setEmailVerificationExpiresAt(null);
                userAccountRepository.save(user);
                throw new BusinessException("Nhập sai mã quá nhiều lần. Hãy yêu cầu gửi lại mã mới.");
            }
            throw new BusinessException("Mã xác thực không hợp lệ");
        }
        verificationFailuresByEmail.remove(email);
        return user;
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
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(ACCOUNT_LOCKED_MESSAGE, "ACCOUNT_LOCKED");
        }
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
