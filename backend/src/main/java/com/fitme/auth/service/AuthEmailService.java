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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthEmailService {

    private static final Logger log = LoggerFactory.getLogger(AuthEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final FitMeProperties fitMeProperties;

    @Value("${spring.mail.host:}")
    private String mailHost;

    public boolean isMailConfigured() {
        return mailHost != null && !mailHost.isBlank() && mailSenderProvider.getIfAvailable() != null;
    }

    /**
     * Delivers the verification code by email when SMTP is configured.
     * When SMTP is off, only allowed if {@code fitme.auth.expose-verification-code=true}
     * (tests / local demo) — production must configure SMTP.
     */
    public void sendVerificationCode(String toEmail, String code) {
        if (!isMailConfigured()) {
            if (fitMeProperties.getAuth().isExposeVerificationCode()) {
                log.warn(
                        "[AUTH] SMTP not configured — verification code for {} available via expose flag only",
                        toEmail);
                return;
            }
            throw new BusinessException(
                    "Hệ thống chưa cấu hình gửi email. Liên hệ quản trị viên (SMTP_HOST).");
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new BusinessException("Không gửi được email xác nhận. Thử lại sau.");
        }

        String fromRaw = fitMeProperties.getAuth().getMailFrom();
        if (fromRaw == null || fromRaw.isBlank()) {
            fromRaw = "noreply@fitme.ai";
        }

        try {
            InternetAddress from = parseFrom(fromRaw);
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject("Mã xác nhận FitMe AI");
            helper.setText(
                    """
                    Xin chào,

                    Mã xác nhận tài khoản FitMe AI của bạn là: %s

                    Mã có hiệu lực trong %d phút. Nếu bạn không đăng ký FitMe, hãy bỏ qua email này.

                    — FitMe AI
                    """
                            .formatted(
                                    code,
                                    Math.max(1, fitMeProperties.getAuth().getVerificationTtlSeconds() / 60)),
                    false);
            mailSender.send(mimeMessage);
            log.info("[AUTH] Verification email sent to {}", toEmail);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[AUTH] Failed to send verification email to {}: {}", toEmail, ex.toString());
            String detail = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            throw new BusinessException(
                    "Không gửi được email xác nhận (" + shorten(detail) + "). Kiểm tra SMTP trên server.");
        }
    }

    private static InternetAddress parseFrom(String raw) throws Exception {
        String trimmed = raw.trim();
        // Prefer RFC 5322 parsing: "Name <email@host>" or bare email.
        InternetAddress[] parsed = InternetAddress.parse(trimmed, false);
        if (parsed.length == 0) {
            throw new BusinessException("SMTP_FROM không hợp lệ");
        }
        return parsed[0];
    }

    private static String shorten(String detail) {
        String cleaned = detail.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > 120) {
            return cleaned.substring(0, 117) + "...";
        }
        return cleaned;
    }
}
