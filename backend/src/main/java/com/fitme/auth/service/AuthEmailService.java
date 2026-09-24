package com.fitme.auth.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

        String from = fitMeProperties.getAuth().getMailFrom();
        if (from == null || from.isBlank()) {
            from = "noreply@fitme.ai";
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(toEmail);
            message.setSubject("Mã xác nhận FitMe AI");
            message.setText(
                    """
                    Xin chào,

                    Mã xác nhận tài khoản FitMe AI của bạn là: %s

                    Mã có hiệu lực trong %d phút. Nếu bạn không đăng ký FitMe, hãy bỏ qua email này.

                    — FitMe AI
                    """
                            .formatted(
                                    code,
                                    Math.max(1, fitMeProperties.getAuth().getVerificationTtlSeconds() / 60)));
            mailSender.send(message);
            log.info("[AUTH] Verification email sent to {}", toEmail);
        } catch (Exception ex) {
            log.error("[AUTH] Failed to send verification email to {}: {}", toEmail, ex.getMessage());
            throw new BusinessException(
                    "Không gửi được email xác nhận. Kiểm tra địa chỉ email hoặc thử lại sau.");
        }
    }
}
