# Test gửi mail xác nhận (local)

## Cách nhanh (đã chạy OK trên máy này)

Không cần Docker / Gmail. Dùng SMTP giả **GreenMail** trong JUnit:

```powershell
cd backend
mvn -Dtest=AuthEmailServiceTest test
```

Kỳ vọng: `Tests run: 2, Failures: 0` — mail chứa mã `654321` được “gửi” vào inbox GreenMail.

## Cách đầy đủ API (cần Docker Postgres)

```powershell
mvn -Dtest=AuthVerificationEmailDeliveryTest test
```

Test này gọi `POST /auth/register` thật rồi đọc mã từ GreenMail. **Cần Docker ổn** (Testcontainers / fallback CLI).

## MailHog + chạy app tay (khi Docker OK)

```powershell
docker run -d --name fitme-mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog
# + Postgres, rồi:
cd backend
$env:SMTP_HOST="localhost"
$env:SMTP_PORT="1025"
$env:SMTP_AUTH="false"
$env:SMTP_STARTTLS="false"
$env:SMTP_FROM="FitMe AI <noreply@fitme.local>"
$env:FITME_AUTH_EXPOSE_VERIFICATION_CODE="false"
$env:FITME_AUTH_MIN_FORM_MS="0"
# + DB_* rồi mvn spring-boot:run
```

UI inbox: http://localhost:8025

## Gmail / Resend thật

Set `SMTP_*` như production rồi `mvn spring-boot:run` và đăng ký bằng email thật.
