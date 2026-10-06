import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { FANPAGE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Liên hệ — FitMe AI",
  description: "Liên hệ đội ngũ FitMe AI để được hỗ trợ tài khoản, gói Premium và hợp tác brand.",
};

const channelClass =
  "flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5";

export default function ContactPage() {
  const hasChannel = Boolean(SUPPORT_EMAIL || SUPPORT_PHONE || FANPAGE_URL);

  return (
    <LegalPage title="Liên hệ" subtitle="FitMe AI luôn sẵn sàng hỗ trợ bạn">
      <LegalSection title="Kênh hỗ trợ">
        {hasChannel ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORT_EMAIL && (
              <a href={`mailto:${SUPPORT_EMAIL}`} className={channelClass}>
                <Mail className="h-5 w-5 text-primary" /> {SUPPORT_EMAIL}
              </a>
            )}
            {SUPPORT_PHONE && (
              <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`} className={channelClass}>
                <Phone className="h-5 w-5 text-primary" /> {SUPPORT_PHONE}
              </a>
            )}
            {FANPAGE_URL && (
              <a href={FANPAGE_URL} target="_blank" rel="noopener noreferrer" className={channelClass}>
                <Globe className="h-5 w-5 text-primary" /> Fanpage FitMe AI
              </a>
            )}
          </div>
        ) : (
          <p>Kênh hỗ trợ trực tiếp đang được cập nhật. Trong lúc chờ, bạn có thể dùng các mục tự phục vụ bên dưới.</p>
        )}
        <p>Thời gian phản hồi: trong vòng 24 giờ làm việc.</p>
      </LegalSection>

      <LegalSection title="Tự xử lý nhanh">
        <ul>
          <li>Sản phẩm bạn đã bấm mua: <Link href="/profile/purchases" className="text-primary underline-offset-2 hover:underline">Hồ sơ → Tủ chi tiêu</Link>. Giao hàng, đổi trả do cửa hàng bạn đã mua hỗ trợ.</li>
          <li>Quên mật khẩu: <Link href="/auth/forgot-password" className="text-primary underline-offset-2 hover:underline">Đặt lại mật khẩu</Link>.</li>
          <li>Xóa dữ liệu / rút lại đồng ý: <Link href="/profile/privacy" className="text-primary underline-offset-2 hover:underline">Hồ sơ → Quyền riêng tư</Link>.</li>
          <li>Câu hỏi về Fitken, gói Premium, thử mặc AI: <Link href="/#faq" className="text-primary underline-offset-2 hover:underline">Câu hỏi thường gặp</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Hợp tác brand">
        <p>
          Bạn là thương hiệu thời trang muốn bán hàng và tiếp cận khách Gen Z trên FitMe?{" "}
          <Link href="/brand/login" className="text-primary underline-offset-2 hover:underline">Đăng ký Brand Portal</Link>{" "}
          để gửi sản phẩm và theo dõi phân tích nhu cầu.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
