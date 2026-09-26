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
        int ttlMinutes = (int) Math.max(1, fitMeProperties.getAuth().getVerificationTtlSeconds() / 60);
        String subject = "Xác nhận email · Bắt đầu thử mặc với FitMe AI";
        String text = verificationPlainText(code, ttlMinutes, toEmail);
        String html = verificationHtml(code, ttlMinutes, toEmail);

        try {
            if (isResendConfigured()) {
                sendViaResendApi(toEmail, fromRaw.trim(), subject, text, html);
            } else {
                sendViaSmtp(toEmail, fromRaw, subject, text, html);
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

    private void sendViaResendApi(String toEmail, String from, String subject, String text, String html) {
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
                            "text", text,
                            "html", html))
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

    private void sendViaSmtp(String toEmail, String fromRaw, String subject, String text, String html)
            throws Exception {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new BusinessException("Không gửi được email xác nhận. Thử lại sau.");
        }
        InternetAddress from = parseFrom(fromRaw);
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom(from);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(text, html);
        mailSender.send(mimeMessage);
    }

    private String verificationPlainText(String code, int ttlMinutes, String toEmail) {
        String verifyUrl = verifyEmailUrl(toEmail);
        StringBuilder sb = new StringBuilder();
        sb.append("FitMe AI — Thử mặc & tư vấn outfit bằng AI\n\n");
        sb.append("Xin chào,\n\n");
        sb.append("Cảm ơn bạn đã đăng ký FitMe AI. Để kích hoạt tài khoản và bắt đầu thử mặc / nhận gợi ý phối đồ, ");
        sb.append("hãy nhập mã xác nhận bên dưới trên trang xác minh email.\n\n");
        sb.append("Mã xác nhận: ").append(code).append("\n");
        sb.append("Hiệu lực: ").append(ttlMinutes).append(" phút\n\n");
        if (verifyUrl != null) {
            sb.append("Mở trang xác minh: ").append(verifyUrl).append("\n\n");
        }
        sb.append("Vì lý do bảo mật, đừng chia sẻ mã này với người khác.\n");
        sb.append("Nếu bạn không tạo tài khoản FitMe AI, vui lòng bỏ qua email này — không có thay đổi nào được thực hiện.\n\n");
        sb.append("Trân trọng,\n");
        sb.append("Đội ngũ FitMe AI\n");
        return sb.toString();
    }

    private String verificationHtml(String code, int ttlMinutes, String toEmail) {
        String verifyUrl = verifyEmailUrl(toEmail);
        String safeCode = escapeHtml(code);
        String ctaBlock = "";
        if (verifyUrl != null) {
            String safeUrl = escapeHtml(verifyUrl);
            ctaBlock = """
                    <tr>
                      <td style="padding:0 32px 28px;text-align:center;">
                        <a href="%s"
                           style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;
                                  font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">
                          Mở trang xác minh
                        </a>
                        <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#6b6578;">
                          hoặc dán mã vào form tại trang xác minh email
                        </p>
                      </td>
                    </tr>
                    """.formatted(safeUrl);
        }
        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f5ebe0;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f5ebe0;padding:32px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                               style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;
                                      box-shadow:0 8px 28px rgba(15,14,20,0.08);">
                          <tr>
                            <td style="padding:28px 32px 8px;background:linear-gradient(135deg,#7c3aed 0%%,#8b5cf6 55%%,#f472b6 100%%);">
                              <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;
                                         color:rgba(255,255,255,0.85);font-weight:600;">FitMe AI</p>
                              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">
                                Xác nhận email để bắt đầu
                              </h1>
                              <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.9);">
                                Thử mặc AI · Tư vấn size &amp; phối đồ
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px 32px 8px;color:#14121c;font-size:15px;line-height:1.6;">
                              <p style="margin:0 0 14px;">Xin chào,</p>
                              <p style="margin:0 0 14px;">
                                Cảm ơn bạn đã đăng ký <strong>FitMe AI</strong>. Nhập mã bên dưới để kích hoạt tài khoản
                                và bắt đầu trải nghiệm thử mặc cùng gợi ý outfit cá nhân hóa.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 32px 20px;">
                              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                                     style="background:#faf8f5;border:1px solid rgba(20,18,28,0.08);border-radius:12px;">
                                <tr>
                                  <td style="padding:20px 16px;text-align:center;">
                                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;
                                               color:#6b6578;font-weight:600;">Mã xác nhận</p>
                                    <p style="margin:0;font-size:32px;letter-spacing:0.28em;font-weight:700;
                                               color:#7c3aed;font-family:Consolas,Monaco,monospace;">%s</p>
                                    <p style="margin:12px 0 0;font-size:13px;color:#6b6578;">
                                      Có hiệu lực trong <strong>%d phút</strong>
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          %s
                          <tr>
                            <td style="padding:0 32px 28px;font-size:13px;line-height:1.55;color:#6b6578;">
                              <p style="margin:0 0 10px;">Vì lý do bảo mật, đừng chia sẻ mã này với người khác.</p>
                              <p style="margin:0;">
                                Nếu bạn không tạo tài khoản FitMe AI, hãy bỏ qua email này — không có thay đổi nào được thực hiện.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,18,28,0.08);
                                       font-size:12px;line-height:1.5;color:#6b6578;">
                              Trân trọng,<br>
                              <strong style="color:#14121c;">Đội ngũ FitMe AI</strong>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """
                .formatted(safeCode, ttlMinutes, ctaBlock);
    }

    private String verifyEmailUrl(String toEmail) {
        String base = fitMeProperties.getFrontend() != null
                ? fitMeProperties.getFrontend().getBaseUrl()
                : null;
        if (base == null || base.isBlank()) {
            return null;
        }
        String normalized = trimTrailingSlash(base.trim());
        return normalized + "/auth/verify-email?email=" + urlEncode(toEmail);
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
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
