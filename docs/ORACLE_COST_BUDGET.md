# Báo cáo chi phí & ngân sách — Oracle Cloud (FitMe production)

**Ngày lập:** 2026-10-14 · **Tenancy:** `khangnt04` · **Home region:** Singapore (`ap-singapore-1`) · **Loại tài khoản:** Free Trial (chưa lên Pay As You Go)

## 1. Chi phí hiện tại

| Kỳ | Chi phí |
|----|---------|
| Tháng 10/2026 (đến 14/10) | **$0.00** |

Dữ liệu chi phí của Oracle trễ khoảng 24 giờ, nên VM tạo ngày 13/10 có thể chưa xuất hiện; vì toàn bộ tài nguyên nằm trong hạn mức Always Free, chi phí kỳ vọng vẫn là $0.

## 2. Tài nguyên đang dùng so với hạn mức Always Free

| Tài nguyên | Đang dùng | Hạn mức free | Ghi chú |
|------------|-----------|--------------|---------|
| VM Ampere A1 (`fitme-prod`) | 1 OCPU · 6 GB RAM | 4 OCPU · 24 GB RAM | Còn dư 3 OCPU / 18 GB |
| Boot volume | 50 GB | 200 GB tổng | |
| VCN (`fitme-vcn`) | 1 | 2 | Subnet public, Internet Gateway, Security List 22/80/443 |
| Băng thông ra internet | — | 10 TB/tháng | App hiện tại dùng rất ít |

**Không** dùng: Autonomous DB, Load Balancer, Object Storage, máy AMD/Intel trả phí. Database (Neon), ảnh (Cloudflare R2), frontend (Vercel) nằm ngoài Oracle.

## 3. Ngân sách & cảnh báo đã cài

Budget **`fitme-monthly-budget`** — **$1/tháng**, áp dụng cho **toàn bộ tenancy**, reset mỗi tháng. Email nhận cảnh báo: email đăng nhập Oracle của chủ tài khoản.

| Rule | Loại | Ngưỡng | Ý nghĩa |
|------|------|--------|---------|
| `any-spend` | Thực tế | 1% ($0.01) | Phát hiện ngay **bất kỳ** chi phí nào — với setup Always Free, mọi khoản > $0 đều bất thường |
| `actual-100` | Thực tế | 100% ($1) | Chi phí thực tế chạm $1 trong tháng |
| `forecast-100` | Dự báo | 100% ($1) | Oracle dự báo tháng này sẽ vượt $1 — cảnh báo trước khi tiền thật bị tính |

Xem/sửa trên web: *Billing & Cost Management → Budgets → fitme-monthly-budget*.

> **Lưu ý quan trọng:** Budget của Oracle chỉ **gửi cảnh báo**, **không tự chặn** chi tiêu. Trong Free Trial, Oracle không trừ tiền thẻ (chỉ dùng $300 credit, hết credit thì tài nguyên trả phí bị dừng). Sau khi nâng lên **Pay As You Go**, tài nguyên trả phí sẽ bị tính tiền thật — khi nhận email cảnh báo cần xoá tài nguyên gây phí ngay.

## 4. Việc nên làm khi nhận email cảnh báo

1. Vào *Billing & Cost Management → Cost Analysis*, lọc theo **Service** để xem khoản nào phát sinh.
2. Thường gặp: tạo nhầm VM shape không phải `VM.Standard.A1.Flex`/`E2.1.Micro`, boot volume vượt 200 GB tổng, bật Load Balancer/Autonomous DB trả phí.
3. Xoá/terminate tài nguyên đó, rồi kiểm tra lại sau 24 giờ.

## 5. Chạy lại báo cáo

Trên máy đã cấu hình OCI CLI (`~/.oci/config`):

```powershell
& $HOME\.oci-cli-venv\Scripts\python.exe deploy\oracle\scripts\oci_cost_report.py
```

In ra: đơn vị tiền tệ, chi phí tháng đến hiện tại theo từng service, chi phí theo ngày 30 ngày gần nhất, và trạng thái các budget + rule cảnh báo.
