package com.fitme.notification;

import com.fitme.auth.service.AuthEmailService;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

import static com.fitme.notification.CustomerEmailService.escape;
import static com.fitme.notification.CustomerEmailService.layout;

/** Tells the account owner that a sign-in credential changed, so a takeover cannot go unnoticed. Never throws. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountSecurityEmailService {

    private static final DateTimeFormatter TIME =
            DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy").withZone(AppClock.BUSINESS_ZONE);
    private static final String NOT_YOU = "Nếu không phải bạn thực hiện hoặc yêu cầu, hãy đặt lại mật khẩu ngay "
            + "và liên hệ đội ngũ FitMe để được hỗ trợ.";

    private final AuthEmailService mail;

    public void send(AccountSecurityEvent event) {
        try {
            switch (event.kind()) {
                case PASSWORD_CHANGED -> notify(event, event.email(), "Mật khẩu của bạn vừa được thay đổi",
                        "Mật khẩu tài khoản FitMe AI (" + event.email() + ") vừa được đổi lúc " + time(event)
                                + ". Các thiết bị khác đã được đăng xuất.");
                case PASSWORD_RESET -> notify(event, event.email(), "Mật khẩu của bạn vừa được đặt lại",
                        "Mật khẩu tài khoản FitMe AI (" + event.email() + ") vừa được đặt lại qua link gửi tới email này lúc "
                                + time(event) + ". Mọi thiết bị đang đăng nhập đã được đăng xuất.");
                case PASSWORD_SET_BY_ADMIN -> notify(event, event.email(), "Quản trị viên đã đặt mật khẩu mới cho tài khoản",
                        "Quản trị viên FitMe vừa đặt mật khẩu mới cho tài khoản " + event.email() + " lúc " + time(event)
                                + " (bàn giao tài khoản). Mọi thiết bị đang đăng nhập đã được đăng xuất. "
                                + "Hãy đổi sang mật khẩu của riêng bạn sau khi đăng nhập.");
                case EMAIL_CHANGED_BY_ADMIN -> {
                    notify(event, event.previousEmail(), "Email đăng nhập của bạn đã được thay đổi",
                            "Quản trị viên FitMe vừa đổi email đăng nhập của tài khoản này từ " + event.previousEmail()
                                    + " sang " + maskEmail(event.email()) + " lúc " + time(event)
                                    + ". Bạn sẽ không đăng nhập bằng email cũ được nữa.");
                    notify(event, event.email(), "Email này đã được gắn với tài khoản FitMe AI",
                            "Từ " + time(event) + ", " + event.email() + " là email đăng nhập của tài khoản FitMe AI"
                                    + " (trước đây là " + maskEmail(event.previousEmail()) + ").");
                }
                case MFA_ENABLED -> notify(event, event.email(), "Đã bật xác thực 2 bước",
                        "Xác thực 2 bước (ứng dụng Authenticator) đã được bật cho " + event.email() + " lúc "
                                + time(event) + ".");
                case MFA_DISABLED -> notify(event, event.email(), "Đã tắt xác thực 2 bước",
                        "Xác thực 2 bước đã bị tắt cho " + event.email() + " lúc " + time(event)
                                + ". Tài khoản giờ chỉ được bảo vệ bằng mật khẩu.");
                case ACCOUNT_DELETION_SCHEDULED -> notify(event, event.email(), "Tài khoản FitMe sẽ được xoá",
                        "Bạn đã yêu cầu xoá tài khoản " + event.email() + " lúc " + time(event)
                                + ". Tài khoản sẽ bị xoá sau khoảng thời gian chờ. "
                                + "Bạn vẫn có thể đăng nhập và huỷ yêu cầu trong khoảng thời gian này. "
                                + "Nếu không phải bạn, hãy huỷ yêu cầu và đổi mật khẩu ngay.");
                case ACCOUNT_DELETION_CANCELLED -> notify(event, event.email(), "Đã huỷ yêu cầu xoá tài khoản",
                        "Yêu cầu xoá tài khoản của bạn đã được huỷ lúc " + time(event)
                                + ". Tài khoản của bạn vẫn hoạt động bình thường.");
                case EMAIL_CHANGED_BY_USER -> {
                    notify(event, event.previousEmail(), "Email đăng nhập của bạn vừa được thay đổi",
                            "Bạn đã đổi email đăng nhập của tài khoản FitMe AI từ " + event.previousEmail()
                                    + " sang " + maskEmail(event.email()) + " lúc " + time(event)
                                    + ". Các thiết bị đang đăng nhập đã được đăng xuất.");
                    notify(event, event.email(), "Email này đã được gắn với tài khoản FitMe AI",
                            "Từ " + time(event) + ", " + event.email() + " là email đăng nhập của tài khoản FitMe AI"
                                    + " (trước đây là " + maskEmail(event.previousEmail()) + ").");
                }
            }
        } catch (RuntimeException ex) {
            log.warn("[MAIL] account security email ({}) skipped: {}", event.kind(), ex.toString());
        }
    }

    private void notify(AccountSecurityEvent event, String to, String heading, String message) {
        String greeting = event.displayName() == null || event.displayName().isBlank() ? "bạn" : event.displayName();
        String link = mail.frontendLink("/auth/forgot-password");
        String text = "FitMe AI — " + heading + "\n\n"
                + "Xin chào " + greeting + ",\n\n"
                + message + "\n\n"
                + NOT_YOU + "\n"
                + (link == null ? "" : "Đặt lại mật khẩu: " + link + "\n")
                + "\nTrân trọng,\nĐội ngũ FitMe AI\n";
        String html = layout(heading,
                "<p style=\"margin:0 0 12px;\">Xin chào " + escape(greeting) + ",</p>"
                        + "<p style=\"margin:0 0 12px;\">" + escape(message) + "</p>"
                        + "<p style=\"margin:0 0 16px;color:#b42318;\">" + escape(NOT_YOU) + "</p>",
                link, "Đặt lại mật khẩu");
        mail.sendNotification(to, "FitMe · " + heading, text, html, "account security");
    }

    private static String time(AccountSecurityEvent event) {
        return TIME.format(event.at());
    }

    /** a***@gmail.com: enough for the owner to recognise, useless to a reader of a forwarded email. */
    static String maskEmail(String email) {
        if (email == null) {
            return "";
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
