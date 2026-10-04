import Link from "next/link";
import { Sparkles } from "lucide-react";
import { consumerShellHorizontalClass, consumerShellMaxWidthClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const linkClass = "transition-colors hover:text-white";

export function Footer({ showOnMobile = false }: { showOnMobile?: boolean }) {
  return (
    <footer
      className={cn(
        "relative mt-auto overflow-hidden bg-[var(--fashion-ink)] text-white",
        showOnMobile ? "block pb-mobile-nav md:pb-0" : "hidden md:block",
      )}
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-pink-600/15 blur-3xl" />
      <div className={cn("relative py-10 md:py-16", consumerShellHorizontalClass, consumerShellMaxWidthClass)}>
        <div className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-ai">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <h3 className="font-display text-lg font-bold">FitMe AI</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Tư vấn size, phối đồ và thử mặc bằng AI trên ảnh của chính bạn — mua đúng ngay từ lần đầu.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Khám phá</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/discover" className={linkClass}>Sản phẩm</Link></li>
              <li><Link href="/ai/start" className={linkClass}>Tư vấn AI</Link></li>
              <li><Link href="/try-on" className={linkClass}>Thử mặc AI</Link></li>
              <li><Link href="/pricing" className={linkClass}>Bảng giá FitMe Pro</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Hỗ trợ</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/#faq" className={linkClass}>Câu hỏi thường gặp</Link></li>
              <li><Link href="/contact" className={linkClass}>Liên hệ</Link></li>
              <li><Link href="/privacy-policy" className={linkClass}>Chính sách bảo mật</Link></li>
              <li><Link href="/terms" className={linkClass}>Điều khoản sử dụng</Link></li>
            </ul>
          </div>
          <div className="hidden md:block">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Đối tác</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/brand/dashboard" className={linkClass}>Brand Portal</Link></li>
              <li><Link href="/admin/dashboard" className={linkClass}>Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:mt-14 sm:flex-row">
          <p className="text-center text-xs text-white/40 sm:text-left">
            © {new Date().getFullYear()} FitMe AI. “Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.”
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">Fashion · AI · Commerce</p>
        </div>
      </div>
    </footer>
  );
}
