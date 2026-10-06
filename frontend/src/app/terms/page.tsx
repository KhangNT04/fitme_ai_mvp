import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng — FitMe AI",
  description: "Điều khoản sử dụng dịch vụ FitMe AI, gói FitMe Premium, Fitken và mua sắm trong ứng dụng.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng" subtitle="Quy định khi sử dụng FitMe AI" updatedAt="04/10/2026">
      <p>
        Khi tạo tài khoản hoặc sử dụng FitMe AI, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi
        sử dụng dịch vụ.
      </p>

      <LegalSection title="1. Tài khoản">
        <ul>
          <li>Bạn cần cung cấp email hợp lệ và tự bảo mật mật khẩu của mình.</li>
          <li>Mỗi người chỉ nên sử dụng một tài khoản; tài khoản tạo hàng loạt để trục lợi ưu đãi có thể bị khóa.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Tư vấn size và thử mặc AI">
        <p>
          Gợi ý size, outfit và ảnh thử mặc được tạo bởi AI mang tính tham khảo và minh họa. Màu sắc, chất liệu và độ
          vừa vặn thực tế có thể khác do ánh sáng, tư thế trong ảnh và thông số của nhà sản xuất.
        </p>
        <p>Bạn chỉ được tải lên ảnh của chính mình hoặc ảnh đã được người trong ảnh đồng ý; không tải nội dung phản cảm hoặc vi phạm pháp luật.</p>
      </LegalSection>

      <LegalSection title="3. Fitken và FitMe Premium">
        <ul>
          <li>Fitken là đơn vị sử dụng tính năng trong ứng dụng, không quy đổi thành tiền mặt và không chuyển nhượng.</li>
          <li>Mỗi lượt thử mặc AI thành công trừ 1 Fitken; lượt lỗi do hệ thống được hoàn Fitken.</li>
          <li>FitMe Premium là gói trả theo tháng (giá hiển thị tại trang Bảng giá), gồm tùy biến phối đồ theo brand yêu thích, tủ đồ cá nhân và Fitken mỗi kỳ; quyền lợi có hiệu lực ngay sau khi thanh toán thành công.</li>
          <li>Fitken miễn phí (dùng thử, điểm danh, chia sẻ, đánh giá) chỉ được cộng tới trần số dư do FitMe công bố; Fitken từ gói Premium hoặc mua thêm không bị giới hạn bởi trần này.</li>
          <li>Phần thưởng nhiệm vụ (điểm danh, chia sẻ, đánh giá) có thể bị thu hồi nếu phát hiện gian lận.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Mua hàng">
        <ul>
          <li>FitMe không bán hàng. Sản phẩm do brand đối tác cung cấp; khi bấm mua, bạn được chuyển tới cửa hàng của brand (website chính hãng hoặc sàn thương mại điện tử) để đặt hàng và thanh toán.</li>
          <li>Giá, tồn kho, giao hàng, đổi trả và hoàn tiền theo chính sách của cửa hàng nơi bạn mua.</li>
          <li>Nếu link mua hàng sai hoặc dẫn tới trang không đúng sản phẩm, vui lòng báo qua trang <Link href="/contact" className="text-primary underline-offset-2 hover:underline">Liên hệ</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Đánh giá sản phẩm">
        <p>
          Đánh giá phải phản ánh trải nghiệm thật. FitMe có quyền ẩn đánh giá spam, sai sự thật hoặc chứa nội dung
          không phù hợp.
        </p>
      </LegalSection>

      <LegalSection title="6. Thay đổi điều khoản">
        <p>
          FitMe có thể cập nhật điều khoản khi dịch vụ thay đổi. Phiên bản mới có hiệu lực kể từ ngày đăng tải trên
          trang này. Xem thêm <Link href="/privacy-policy" className="text-primary underline-offset-2 hover:underline">Chính sách bảo mật</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
