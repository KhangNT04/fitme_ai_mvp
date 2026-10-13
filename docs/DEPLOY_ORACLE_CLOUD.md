# Deploy FitMe AI — Oracle Cloud Always Free (backend chính)

Backend Spring Boot + `ai-vton` + Caddy (HTTPS) chạy chung **1 VM ARM Ampere A1** ở region **Singapore**, miễn phí trong hạn mức Always Free. Frontend (Vercel), database (Neon) và ảnh (Cloudflare R2) **giữ nguyên**. Render chuyển thành backup lạnh (suspend).

```
Người dùng → Vercel (Next.js) ── /api/v1/*, /uploads/* ──► https://<FITME_API_DOMAIN>
                                                              │  Oracle VM (Singapore, ARM64)
                                                              │  Caddy :443 → backend:8080 → ai-vton:8001
                                                              ▼
                                         Neon Postgres (ap-southeast-1) · Cloudflare R2
```

File trong repo: [`docker-compose.oracle.yml`](../docker-compose.oracle.yml), [`deploy/oracle/`](../deploy/oracle/) (`.env.oracle.example`, `Caddyfile`, `scripts/setup-server.sh`, `scripts/deploy-oracle.sh`).

---

## 1. Tạo tài khoản Oracle Cloud

1. Đăng ký tại [cloud.oracle.com](https://signup.cloud.oracle.com) — cần thẻ Visa/Master quốc tế (chỉ xác minh, không trừ tiền).
2. **Home Region: chọn `Singapore`** — không đổi được sau này, và tài nguyên free chỉ tạo được ở home region. Singapore cùng khu vực với Neon nên truy vấn DB nhanh.
3. **Nâng lên Pay As You Go (khuyến nghị mạnh):** *Billing & Cost Management → Upgrade and Manage Payment → Pay As You Go*. Vẫn **$0** nếu chỉ dùng tài nguyên Always Free, nhưng VM **không bị Oracle thu hồi** khi nhàn rỗi (tài khoản free thuần bị thu hồi VM nếu CPU/RAM/mạng < 20% suốt 7 ngày — app ít traffic rất dễ dính).
4. Tạo cảnh báo ngân sách: *Billing → Budgets → Create Budget* — $1/tháng, alert 100% về email, để biết ngay nếu lỡ tạo tài nguyên tính phí. Cấu hình đang dùng cho production + báo cáo chi phí: [`ORACLE_COST_BUDGET.md`](./ORACLE_COST_BUDGET.md).

## 2. Tạo SSH key (trên máy Windows)

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\fitme_oracle -C fitme-oracle
Get-Content $HOME\.ssh\fitme_oracle.pub   # copy dòng này để dán vào bước 3
```

## 3. Tạo VM + mở cổng

### 3.1. Instance

*Compute → Instances → Create instance*:

| Mục | Giá trị |
|-----|---------|
| Name | `fitme-prod` |
| Image | **Canonical Ubuntu 24.04** |
| Shape | *Change shape → Ampere → `VM.Standard.A1.Flex`* — **2 OCPU, 12 GB RAM** (hạn mức free tổng 4 OCPU / 24 GB) |
| Networking | *Create new virtual cloud network* + *public subnet*, **Assign a public IPv4 address** |
| SSH keys | *Paste public keys* → dán nội dung `fitme_oracle.pub` |
| Boot volume | mặc định (~47 GB, free tới 200 GB) |

Báo **"Out of capacity for shape VM.Standard.A1.Flex"**: đổi *Availability domain* khác, giảm còn 1 OCPU / 6 GB, hoặc thử lại sau vài giờ (thường dễ hơn vào sáng sớm). Đây là giới hạn phía Oracle, không phải lỗi cấu hình.

Ghi lại **Public IP** (vd. `140.238.1.2`).

### 3.2. Security List — mở 80/443

*Networking → Virtual cloud networks → (VCN vừa tạo) → Subnets → public subnet → Default Security List → Add Ingress Rules*:

| Source CIDR | IP Protocol | Destination port |
|-------------|-------------|------------------|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(Cổng 22 đã có sẵn.) Oracle còn một lớp firewall thứ hai là **iptables trong VM** — script ở bước 4 tự mở.

## 4. Bootstrap server

```powershell
ssh -i $HOME\.ssh\fitme_oracle ubuntu@140.238.1.2
```

Trên VM:

```bash
curl -fsSL https://raw.githubusercontent.com/KhangNT04/fitme_ai_mvp/main/deploy/oracle/scripts/setup-server.sh | bash
exit   # thoát rồi ssh lại để nhận quyền group docker
```

Script: update hệ thống, mở 80/443 trong iptables, cài Docker, clone repo vào `/opt/fitme`.

## 5. Domain + biến môi trường

### 5.1. Domain

- **Có domain riêng:** tạo bản ghi `A` `api` → IP VM (Cloudflare: để **DNS only** khi cấp SSL lần đầu). `FITME_API_DOMAIN=api.yourdomain.com`.
- **Chưa có domain:** dùng [sslip.io](https://sslip.io) — không cần cấu hình gì: IP `140.238.1.2` → `FITME_API_DOMAIN=140-238-1-2.sslip.io`. Caddy vẫn xin được chứng chỉ Let's Encrypt.

### 5.2. `.env.oracle`

Cách dễ nhất: điền trên máy Windows rồi copy lên (file đã nằm trong `.gitignore`):

```powershell
cd C:\Workspace\fitme
Copy-Item deploy\oracle\.env.oracle.example .env.oracle
# mở .env.oracle, điền giá trị (copy từ Render dashboard: fitme-api + fitme-ai-vton → Environment)
scp -i $HOME\.ssh\fitme_oracle .env.oracle ubuntu@140.238.1.2:/opt/fitme/.env.oracle
```

Biến quan trọng:

| Biến | Ghi chú |
|------|---------|
| `FITME_API_DOMAIN` | Domain ở 5.1, không có `https://` |
| `FITME_PUBLIC_BASE_URL` | `https://<FITME_API_DOMAIN>` |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | **Cùng Neon** với Render |
| `JWT_SECRET` | **Giống hệt** Render + Vercel, nếu khác mọi người bị đăng xuất |
| `R2_*` | **Cùng bucket** với Render |
| `PAYOS_*` | Copy từ Render; prod bắt buộc `PAYOS_MOCK=false` |
| `AI_VTON_INTERNAL_TOKEN` = `VTON_INTERNAL_TOKEN` | Chuỗi ngẫu nhiên, 2 biến **phải trùng nhau** |
| `FITME_AI_MODE` / `AI_MODE` | Giữ như Render (`hf`), hoặc `api` + `FASHN_API_KEY` |
| Email (`RESEND_API_KEY` / `MAIL_RELAY_*`) | Bỏ comment đúng biến Render đang dùng. Oracle chặn cổng 25 nhưng app gửi qua HTTPS nên không ảnh hưởng |

`SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=0` (có sẵn trong template) cho phép Neon tự tắt compute khi không có ai dùng app — backend chạy 24/7 nên nếu giữ kết nối mở liên tục sẽ đốt giờ compute free của Neon.

## 6. Deploy

```bash
cd /opt/fitme
./deploy/oracle/scripts/deploy-oracle.sh
```

Script kiểm tra biến bắt buộc → `git pull` → build image ARM64 (lần đầu ~5–10 phút) → chạy `backend`, `ai-vton`, `caddy` → chờ `/actuator/health` = `UP` → thử HTTPS public.

Kiểm tra từ máy bạn:

```powershell
curl https://140-238-1-2.sslip.io/actuator/health
curl https://140-238-1-2.sslip.io/api/v1/products
```

## 7. Chuyển traffic thật (cutover)

1. **Vercel** → Project → *Settings → Environment Variables* → `BACKEND_INTERNAL_URL` = `https://<FITME_API_DOMAIN>` → **Redeploy** (rewrite đọc biến này lúc build).
2. **PayOS** ([my.payos.vn](https://my.payos.vn)) → đổi webhook thành `https://<FITME_API_DOMAIN>/api/v1/webhooks/payos` → Lưu (VM luôn chạy nên không còn lỗi timeout 10s như Render free).
3. Mở app trên Vercel: đăng nhập, chat stylist, thử đồ, thanh toán thử, brand/admin portal.
4. **Render** → service `fitme-api` → *Settings → Suspend*. Backend có job nền (hết hạn đơn PayOS mỗi 15 phút, hết hạn gói/voucher lúc 0h) — nếu Render bị ai đó gọi URL và thức dậy, job sẽ chạy trùng với VM trên cùng DB. `fitme-ai-vton` trên Render cũng có thể suspend.

**Rollback:** Resume Render → mở `https://fitme-ai-mvp.onrender.com/actuator/health` chờ `UP` → đổi `BACKEND_INTERNAL_URL` về URL Render + Redeploy → đổi webhook PayOS về Render → trên VM `docker compose -f docker-compose.oracle.yml --env-file .env.oracle stop`.

## 8. Vận hành

| Việc | Lệnh (trên VM, trong `/opt/fitme`) |
|------|-------------------------------------|
| Deploy code mới sau khi push `main` | `./deploy/oracle/scripts/deploy-oracle.sh` |
| Trạng thái | `docker compose -f docker-compose.oracle.yml --env-file .env.oracle ps` |
| Log backend | `docker logs fitme-backend --tail=200 -f` |
| Log try-on / HTTPS | `docker logs fitme-ai-vton --tail=100` · `docker logs fitme-caddy --tail=100` |
| Sửa env | sửa `.env.oracle` rồi `./deploy/oracle/scripts/deploy-oracle.sh --no-pull` |

Giám sát: [UptimeRobot](https://uptimerobot.com) ping `https://<FITME_API_DOMAIN>/actuator/health` mỗi 5 phút để nhận email khi VM/container chết.

## 9. Troubleshooting

| Triệu chứng | Cách xử lý |
|-------------|------------|
| SSH timeout | Sai IP, hoặc VM chưa *Running*; dùng đúng user `ubuntu` và key `fitme_oracle` |
| `curl https://...` connection refused/timeout | Thiếu Ingress 80/443 ở Security List (3.2) hoặc iptables (chạy lại `setup-server.sh`); DNS chưa trỏ đúng IP |
| Caddy log `challenge failed` | Như trên — Let's Encrypt phải vào được cổng 80 từ internet |
| Backend restart liên tục | `docker logs fitme-backend` — thường sai `DB_URL`, `PAYOS_MOCK=true`, thiếu `PAYOS_CHECKSUM_KEY` |
| Try-on luôn ra ảnh ghép minh họa | `docker logs fitme-ai-vton`; kiểm tra `AI_MODE`, `HF_TOKEN`/`FASHN_API_KEY`, 2 token nội bộ trùng nhau, R2 public URL mở được |
| Đăng nhập bị văng sau cutover | `JWT_SECRET` khác Vercel/Render |
| Build bị kill (OOM) | Shape quá nhỏ (1 OCPU/6 GB vẫn đủ nhưng build chậm) — thêm swap: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
