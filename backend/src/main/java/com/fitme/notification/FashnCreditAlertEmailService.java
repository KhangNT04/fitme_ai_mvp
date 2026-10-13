package com.fitme.notification;

import com.fitme.auth.service.AuthEmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.fitme.notification.CustomerEmailService.escape;
import static com.fitme.notification.CustomerEmailService.layout;

@Service
@RequiredArgsConstructor
public class FashnCreditAlertEmailService {

    private final AuthEmailService mail;

    /** @return how many admins the alert was delivered to */
    public int sendLowBalance(List<String> adminEmails, int total, int threshold, Integer estimatedDaysLeft,
                              String topUpUrl) {
        String heading = "Credit FASHN sắp hết: còn " + total;
        String forecast = estimatedDaysLeft == null
                ? ""
                : " Với mức dùng hiện tại, số credit này đủ khoảng " + estimatedDaysLeft + " ngày.";
        String message = "Số dư FASHN API còn " + total + " credit (ngưỡng cảnh báo: " + threshold + ")." + forecast
                + " Khi hết credit, thử mặc AI sẽ báo lỗi cho người dùng.";
        String monitoringLink = mail.frontendLink("/admin/try-on-monitoring");
        String text = "FitMe AI — " + heading + "\n\n"
                + message + "\n\n"
                + "Mua thêm credit: " + topUpUrl + "\n"
                + (monitoringLink == null ? "" : "Theo dõi trong trang quản trị: " + monitoringLink + "\n");
        String html = layout(heading,
                "<p style=\"margin:0 0 12px;\">" + escape(message) + "</p>"
                        + (monitoringLink == null ? "" : "<p style=\"margin:0 0 16px;\"><a href=\""
                        + escape(monitoringLink) + "\">Xem trong trang quản trị</a></p>"),
                topUpUrl, "Mua thêm credit");

        int delivered = 0;
        for (String email : adminEmails) {
            if (mail.sendNotification(email, "FitMe · " + heading, text, html, "fashn low credit")) {
                delivered++;
            }
        }
        return delivered;
    }
}
