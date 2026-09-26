package com.fitme.auth.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthEmailService {

    private static final Logger log = LoggerFactory.getLogger(AuthEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final FitMeProperties fitMeProperties;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    /** Override in tests; production uses https://api.resend.com */
    @Value("${fitme.auth.resend-api-base-url:https://api.resend.com}")
    private String resendApiBaseUrl;

    public boolean isMailConfigured() {
        return isResendConfigured() || isSmtpConfigured();
    }

    private boolean isResendConfigured() {
        return resolveResendApiKey() != null;
    }

    /**
     * Prefer explicit RESEND_API_KEY; otherwise reuse SMTP_PASSWORD when it looks like a Resend key (re_...).
     * Render blocks SMTP :587, so the same Resend secret must be used over HTTPS.
     */
    private String resolveResendApiKey() {
        String explicit = fitMeProperties.getAuth().getResendApiKey();
        if (explicit != null && !explicit.isBlank()) {
            return explicit.trim();
        }
        if (mailPassword != null && mailPassword.trim().startsWith("re_")) {
            return mailPassword.trim();
        }
        return null;
    }

    private boolean isSmtpConfigured() {
        return mailHost != null && !mailHost.isBlank() && mailSenderProvider.getIfAvailable() != null;
    }

    /**
     * Delivers the verification code by email.
     * Prefers Resend HTTPS API (works on Render); falls back to SMTP.
     * When neither is configured, only allowed if {@code fitme.auth.expose-verification-code=true}.
     */
    public void sendVerificationCode(String toEmail, String code) {
        if (!isMailConfigured()) {
            if (fitMeProperties.getAuth().isExposeVerificationCode()) {
                log.warn(
                        "[AUTH] Email delivery not configured — verification code for {} available via expose flag only",
                        toEmail);
                return;
            }
            throw new BusinessException(
                    "Hệ thống chưa cấu hình gửi email. Liên hệ quản trị viên (RESEND_API_KEY / SMTP).");
        }

        String fromRaw = fitMeProperties.getAuth().getMailFrom();
        if (fromRaw == null || fromRaw.isBlank()) {
            fromRaw = "noreply@fitme.ai";
        }
        String subject = "Mã xác nhận FitMe AI";
        String text = verificationBody(code);

        try {
            if (isResendConfigured()) {
                sendViaResendApi(toEmail, fromRaw.trim(), subject, text);
            } else {
                sendViaSmtp(toEmail, fromRaw, subject, text);
            }
            log.info("[AUTH] Verification email sent to {}", toEmail);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[AUTH] Failed to send verification email to {}: {}", toEmail, ex.toString());
            String detail = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            throw new BusinessException(
                    "Không gửi được email xác nhận (" + shorten(detail) + "). Kiểm tra cấu hình email trên server.");
        }
    }

    private void sendViaResendApi(String toEmail, String from, String subject, String text) {
        String apiKey = resolveResendApiKey();
        if (apiKey == null) {
            throw new BusinessException("RESEND_API_KEY chưa cấu hình");
        }
        try {
            RestClient.create()
                    .post()
                    .uri(trimTrailingSlash(resendApiBaseUrl) + "/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "from", from,
                            "to", List.of(toEmail),
                            "subject", subject,
                            "text", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            log.error(
                    "[AUTH] Resend API rejected send to {}: {} {}",
                    toEmail,
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString());
            throw new BusinessException(
                    "Không gửi được email xác nhận (Resend HTTP "
                            + ex.getStatusCode().value()
                            + "). Kiểm tra RESEND_API_KEY / SMTP_FROM.");
        }
    }

    private void sendViaSmtp(String toEmail, String fromRaw, String subject, String text) throws Exception {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new BusinessException("Không gửi được email xác nhận. Thử lại sau.");
        }
        InternetAddress from = parseFrom(fromRaw);
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
        helper.setFrom(from);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(text, false);
        mailSender.send(mimeMessage);
    }

    private String verificationBody(String code) {
        return """
                Xin chào,

                Mã xác nhận tài khoản FitMe AI của bạn là: %s

                Mã có hiệu lực trong %d phút. Nếu bạn không đăng ký FitMe, hãy bỏ qua email này.

                — FitMe AI
                """
                .formatted(
                        code,
                        Math.max(1, fitMeProperties.getAuth().getVerificationTtlSeconds() / 60));
    }

    private static InternetAddress parseFrom(String raw) throws Exception {
        String trimmed = raw.trim();
        InternetAddress[] parsed = InternetAddress.parse(trimmed, false);
        if (parsed.length == 0) {
            throw new BusinessException("SMTP_FROM không hợp lệ");
        }
        return parsed[0];
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "https://api.resend.com";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String shorten(String detail) {
        String cleaned = detail.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > 120) {
            return cleaned.substring(0, 117) + "...";
        }
        return cleaned;
    }
}
