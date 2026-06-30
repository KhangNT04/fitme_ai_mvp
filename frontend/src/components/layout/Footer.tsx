import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-auto hidden overflow-hidden bg-[var(--fashion-ink)] text-white md:block">
      <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-pink-600/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-ai">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <h3 className="font-display text-lg font-bold">FitMe AI</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Tư vấn size & phối đồ bằng AI. Preview outfit 2D minh họa.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Khám phá</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/discover" className="transition-colors hover:text-white">Sản phẩm</Link></li>
              <li><Link href="/ai/start" className="transition-colors hover:text-white">Tư vấn AI</Link></li>
              <li><Link href="/try-on" className="transition-colors hover:text-white">Thử mặc AI</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Đối tác</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/brand/login" className="transition-colors hover:text-white">Brand Portal</Link></li>
              <li><Link href="/admin/login" className="transition-colors hover:text-white">Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-center text-xs text-white/40 sm:text-left">
            © {new Date().getFullYear()} FitMe AI. “Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.”.
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">Fashion · AI · Commerce</p>
        </div>
      </div>
    </footer>
  );
}
