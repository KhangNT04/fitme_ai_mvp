import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — FitMe AI",
  description: "Cách FitMe AI thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Chính sách bảo mật" subtitle="Cách FitMe AI xử lý dữ liệu cá nhân" updatedAt="04/10/2026">
      <p>
        FitMe AI tôn trọng quyền riêng tư của bạn và xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP về bảo vệ
        dữ liệu cá nhân. Chính sách này giải thích dữ liệu nào được thu thập, dùng để làm gì và bạn kiểm soát chúng
        như thế nào.
      </p>

      <LegalSection title="1. Dữ liệu chúng tôi thu thập">
        <ul>
          <li>Thông tin tài khoản: họ tên hiển thị, email, mật khẩu (được mã hóa một chiều).</li>
          <li>Hồ sơ cơ thể và phong cách bạn tự nhập: chiều cao, cân nặng, số đo, dáng người, sở thích.</li>
          <li>Ảnh bạn tải lên để thử mặc AI và ảnh kết quả được tạo ra.</li>
          <li>Lịch sử thanh toán gói FitMe Pro / Fitken và các lượt bạn bấm mua sang cửa hàng của brand.</li>
          <li>Dữ liệu sử dụng: trang đã xem, tính năng đã dùng, nguồn truy cập (UTM), thiết bị và trình duyệt.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Mục đích sử dụng">
        <ul>
          <li>Tư vấn size, gợi ý outfit và tạo ảnh thử mặc theo yêu cầu của bạn.</li>
          <li>Xử lý thanh toán gói FitMe Pro / Fitken và chăm sóc khách hàng.</li>
          <li>Gửi email xác minh tài khoản, đặt lại mật khẩu và xác nhận thanh toán gói.</li>
          <li>Thống kê ẩn danh để cải thiện sản phẩm (Google Analytics, Microsoft Clarity).</li>
        </ul>
        <p>Chúng tôi không bán dữ liệu cá nhân của bạn cho bên thứ ba.</p>
      </LegalSection>

      <LegalSection title="3. Chia sẻ dữ liệu">
        <ul>
          <li>Brand đối tác: chỉ nhận số liệu tổng hợp, ẩn danh (lượt xem, lượt bấm mua, thử mặc). Khi bạn mua tại cửa hàng của brand, dữ liệu đặt hàng do cửa hàng đó xử lý theo chính sách riêng của họ.</li>
          <li>Đơn vị thanh toán PayOS: thông tin giao dịch khi bạn mua gói FitMe Pro hoặc Fitken.</li>
          <li>Nhà cung cấp hạ tầng và AI (lưu trữ, gửi email, tạo ảnh thử mặc) xử lý dữ liệu thay mặt FitMe theo hợp đồng bảo mật.</li>
          <li>Cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Ảnh thử mặc">
        <p>
          Ảnh của bạn chỉ dùng để tạo kết quả thử mặc cho chính bạn. Ảnh không được đăng công khai trừ khi bạn chủ
          động chia sẻ. Bạn có thể xóa ảnh trong tủ đồ bất kỳ lúc nào.
        </p>
      </LegalSection>

      <LegalSection title="5. Lưu trữ và bảo mật">
        <p>
          Dữ liệu được truyền qua kết nối mã hóa (HTTPS) và lưu trên máy chủ có kiểm soát truy cập. Dữ liệu được giữ
          trong thời gian tài khoản còn hoạt động, hoặc lâu hơn khi pháp luật yêu cầu (ví dụ chứng từ giao dịch).
        </p>
      </LegalSection>

      <LegalSection title="6. Quyền của bạn">
        <ul>
          <li>Xem, chỉnh sửa thông tin hồ sơ trong ứng dụng.</li>
          <li>Rút lại sự đồng ý và yêu cầu xóa dữ liệu tại <Link href="/profile/privacy" className="text-primary underline-offset-2 hover:underline">Hồ sơ → Quyền riêng tư</Link>.</li>
          <li>Khiếu nại hoặc đặt câu hỏi qua trang <Link href="/contact" className="text-primary underline-offset-2 hover:underline">Liên hệ</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Cookie và công cụ phân tích">
        <p>
          FitMe dùng bộ nhớ trình duyệt để duy trì đăng nhập, ghi nhớ nguồn truy cập lần đầu và (nếu được bật) Google
          Analytics, Microsoft Clarity để hiểu cách người dùng sử dụng sản phẩm. Bạn có thể xóa dữ liệu này trong cài
          đặt trình duyệt.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
