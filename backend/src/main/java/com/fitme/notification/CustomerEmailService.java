package com.fitme.notification;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.auth.service.AuthEmailService;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.entity.ConsumerBillingOrder;
import com.fitme.billing.entity.ConsumerSubscription;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.ConsumerBillingOrderRepository;
import com.fitme.billing.repository.ConsumerSubscriptionRepository;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/** Transactional customer emails (plan purchased). Best-effort: never throws. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerEmailService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(AppClock.BUSINESS_ZONE);

    private final AuthEmailService mail;
    private final UserAccountRepository userAccountRepository;
    private final ConsumerBillingOrderRepository billingOrderRepository;
    private final BillingPlanRepository planRepository;
    private final ConsumerSubscriptionRepository subscriptionRepository;

    @Value("${fitme.notifications.customer-emails:true}")
    private boolean enabled;

    @Transactional(readOnly = true)
    public boolean planPurchased(UUID billingOrderId) {
        if (!enabled) {
            return false;
        }
        try {
            ConsumerBillingOrder order = billingOrderRepository.findById(billingOrderId).orElse(null);
            if (order == null) {
                return false;
            }
            UserAccount user = userAccountRepository.findById(order.getUserId()).orElse(null);
            BillingPlan plan = planRepository.findById(order.getPlanId()).orElse(null);
            if (user == null || plan == null) {
                return false;
            }
            boolean topup = plan.getPlanType() == BillingPlanType.TOPUP;
            Instant expiresAt = topup ? null
                    : subscriptionRepository.findByUserId(user.getId()).map(ConsumerSubscription::getExpiresAt).orElse(null);

            List<String> lines = new ArrayList<>();
            lines.add("Gói: " + plan.getName());
            lines.add("Số tiền: " + vnd(order.getAmountVnd()));
            lines.add("Fitken được cộng: " + plan.getQuotaAmount());
            if (expiresAt != null) {
                lines.add("Hiệu lực Premium đến: " + DATE.format(expiresAt));
            }
            String heading = topup ? "Đã cộng Fitken vào ví của bạn" : "Gói Premium đã được kích hoạt";
            String subject = "FitMe · " + heading;
            String link = mail.frontendLink(topup ? "/try-on" : "/pricing");
            String text = "FitMe AI — " + heading + "\n\n"
                    + "Xin chào " + greetingName(user) + ",\n\n"
                    + "Cảm ơn bạn đã thanh toán. Chi tiết giao dịch:\n"
                    + lines.stream().map(line -> "- " + line).collect(Collectors.joining("\n")) + "\n\n"
                    + (link == null ? "" : "Bắt đầu thử mặc: " + link + "\n\n")
                    + "Trân trọng,\nĐội ngũ FitMe AI\n";
            String rows = lines.stream()
                    .map(line -> "<li style=\"margin:0 0 6px;\">" + escape(line) + "</li>")
                    .collect(Collectors.joining());
            String html = layout(heading,
                    "<p style=\"margin:0 0 12px;\">Xin chào " + escape(greetingName(user)) + ",</p>"
                            + "<p style=\"margin:0 0 12px;\">Cảm ơn bạn đã thanh toán. Chi tiết giao dịch:</p>"
                            + "<ul style=\"margin:0 0 16px;padding-left:20px;\">" + rows + "</ul>",
                    link, "Thử mặc ngay");
            return mail.sendNotification(user.getEmail(), subject, text, html, "plan purchased");
        } catch (RuntimeException ex) {
            log.warn("[MAIL] plan purchased email for {} skipped: {}", billingOrderId, ex.toString());
            return false;
        }
    }

    private static String greetingName(UserAccount user) {
        return user.getDisplayName() == null || user.getDisplayName().isBlank() ? "bạn" : user.getDisplayName();
    }

    private static String layout(String heading, String body, String link, String cta) {
        String button = link == null ? "" : """
                <tr><td style="padding:0 32px 24px;text-align:center;">
                  <a href="%s" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;
                     font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">%s</a>
                </td></tr>
                """.formatted(escape(link), escape(cta));
        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:32px 16px;background:#f5ebe0;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                         style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;">
                    <tr><td style="padding:28px 32px 8px;color:#14121c;font-size:15px;line-height:1.6;">
                      <h1 style="margin:0 0 14px;font-size:20px;color:#7c3aed;">%s</h1>
                      %s
                    </td></tr>
                    %s
                    <tr><td style="padding:16px 32px 24px;border-top:1px solid rgba(20,18,28,0.08);font-size:12px;color:#6b6578;">
                      Trân trọng,<br><strong style="color:#14121c;">Đội ngũ FitMe AI</strong>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(escape(heading), body, button);
    }

    static String vnd(long amount) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " ₫";
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
