# Test gửi mail xác nhận (local)

## Unit (khuyến nghị)

Không cần Docker / Gmail. Dùng SMTP giả **GreenMail** + mock Resend HTTP trong JUnit:

```bash
cd backend
mvn -Dtest=AuthEmailServiceTest test
```

Kỳ vọng: `Tests run: 3, Failures: 0` — SMTP GreenMail + Resend HTTPS mock.

## MailHog (SMTP thật trong Docker)

```bash
docker run -d --name fitme-mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

```powershell
$env:SMTP_HOST="localhost"
$env:SMTP_PORT="1025"
$env:SMTP_AUTH="false"
$env:SMTP_STARTTLS="false"
$env:SMTP_FROM="FitMe AI <noreply@fitme.local>"
# Không set SMTP_PASSWORD bắt đầu bằng re_ (sẽ đi Resend HTTP)
```

Mở UI MailHog: http://localhost:8025

## Resend / production (Render)

Render thường **chặn outbound SMTP :587**. App ưu tiên **Resend HTTPS API** khi:

- `RESEND_API_KEY=re_...`, hoặc
- `SMTP_PASSWORD` bắt đầu bằng `re_` (cùng key Resend)

`SMTP_FROM` phải là địa chỉ Resend cho phép (vd. `FitMe AI <onboarding@resend.dev>` hoặc domain đã verify).
